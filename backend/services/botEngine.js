const { chatWithHistory } = require('./anthropicClient');
const { getDb } = require('../db/db');

function getPropertiesSummary() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT id, name, property_type, location, base_rate, max_guests, amenities FROM properties').all();
    if (rows && rows.length > 0) {
      return rows.map((p, i) => `${i + 1}. ${p.name} — ${p.property_type} in ${p.location} (₹${p.base_rate.toLocaleString('en-IN')}/night). Max ${p.max_guests} guests.`).join('\n');
    }
  } catch (e) {
    // fallback
  }
  return `1. Casa Azul — Luxury Pool Villa in Anjuna, Goa (₹4,500/night, max 6 guests)
2. Cedar Peak Chalet — Mountain Pine Chalet in Manali (₹5,800/night, max 6 guests)
3. Haveli Heritage Stay — Royal Heritage Suite in Jaipur (₹3,200/night, max 3 guests)
4. The Skyline Penthouse — Modern Loft in Bandra, Mumbai (₹7,500/night, max 4 guests)`;
}

const SYSTEM_PROMPT = `You are a friendly, knowledgeable 24/7 WhatsApp guest concierge and booking assistant for Wayzyy short-term rentals and vacation stays. You help guests discover, inquire about, and seamlessly book vacation stays listed by local hosts.

Available Properties Portfolio:
${getPropertiesSummary()}

Your Responsibilities:
1. Understand what the guest is asking (check availability, price quote, property recommendations, book reservation, or destination travel questions).
2. Extract key booking data: check-in date, check-out date, number of guests, preferred property name or location.
3. Provide warm, polite, and conversational responses in natural, welcoming hospitality English.
4. Guide guests smoothly through the booking journey: inquiry → availability check → price confirmation → ready to book → booking confirmed.

ALWAYS respond strictly with this JSON format (no markdown fences, no extra text):
{
  "reply": "Your friendly conversational response to the guest",
  "intent": "check_availability|book|cancel|price_inquiry|recommendation|general",
  "extractedData": {
    "checkIn": "YYYY-MM-DD or text or null",
    "checkOut": "YYYY-MM-DD or text or null",
    "guests": 2,
    "property": "property name or null",
    "location": "location name or null"
  },
  "suggestedActions": ["Check Dates", "Book Now", "View Stays"],
  "bookingStatus": "inquiry|checking|ready_to_book|confirmed|null"
}`;

// In-memory conversation store for multi-turn sessions
const conversations = new Map();

function getConversation(conversationId = 'default') {
  if (!conversations.has(conversationId)) {
    conversations.set(conversationId, {
      messages: [],
      context: {
        property: null,
        checkIn: null,
        checkOut: null,
        guests: null,
        status: 'inquiry'
      },
      createdAt: new Date().toISOString()
    });
  }
  return conversations.get(conversationId);
}

async function processMessage(conversationId = 'default', userMessage = '') {
  const conv = getConversation(conversationId);
  conv.messages.push({ role: 'user', content: userMessage });

  const llmResponse = await chatWithHistory(SYSTEM_PROMPT, conv.messages, { maxTokens: 800 });

  if (llmResponse) {
    try {
      const cleaned = llmResponse.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
      const parsed = JSON.parse(cleaned);

      conv.messages.push({ role: 'assistant', content: parsed.reply || llmResponse });

      if (parsed.extractedData) {
        conv.context = { ...conv.context, ...parsed.extractedData };
      }
      if (parsed.bookingStatus) {
        conv.context.status = parsed.bookingStatus;
      }

      return {
        reply: parsed.reply,
        intent: parsed.intent || 'general',
        extractedData: conv.context,
        suggestedActions: parsed.suggestedActions || ['View Stays', 'Check Availability', 'Ask Pricing'],
        bookingStatus: parsed.bookingStatus || conv.context.status || 'inquiry',
        conversationId
      };
    } catch (e) {
      console.warn('Failed to parse bot JSON response, falling back to text:', e.message);
      conv.messages.push({ role: 'assistant', content: llmResponse });
      return {
        reply: llmResponse,
        intent: 'general',
        extractedData: conv.context,
        suggestedActions: ['Check Availability', 'View Pricing', 'Book Stay'],
        bookingStatus: conv.context.status || 'inquiry',
        conversationId
      };
    }
  }

  // Domain-specific rule-based fallback
  const lower = userMessage.toLowerCase();
  let intent = 'general';
  let reply = '';
  let actions = [];
  let status = conv.context.status || 'inquiry';

  // Extract property if mentioned
  if (lower.includes('casa') || lower.includes('azul') || lower.includes('pool') || lower.includes('anjuna')) {
    conv.context.property = 'Casa Azul Pool Villa';
    conv.context.location = 'Anjuna';
  } else if (lower.includes('manali') || lower.includes('cedar') || lower.includes('chalet') || lower.includes('mountain')) {
    conv.context.property = 'Cedar Peak Chalet';
    conv.context.location = 'Manali';
  } else if (lower.includes('jaipur') || lower.includes('haveli') || lower.includes('heritage')) {
    conv.context.property = 'Haveli Heritage Stay';
    conv.context.location = 'Jaipur';
  } else if (lower.includes('mumbai') || lower.includes('bandra') || lower.includes('skyline') || lower.includes('penthouse') || lower.includes('loft')) {
    conv.context.property = 'The Skyline Penthouse';
    conv.context.location = 'Mumbai';
  }

  // Extract guest count
  const guestMatch = lower.match(/(\d+)\s*(guest|person|people|adult)/i);
  if (guestMatch) {
    conv.context.guests = parseInt(guestMatch[1], 10);
  }

  if (lower.includes('book') || lower.includes('reserve') || lower.includes('confirm')) {
    intent = 'book';
    status = 'ready_to_book';
    if (conv.context.property) {
      reply = `Wonderful! ✨ I would love to reserve **${conv.context.property}** (${conv.context.location || 'Vacation Stay'}) for you.\n\nCould you please share your target check-in & check-out dates and party size? I'll prepare your direct-booking confirmation with the host immediately!`;
      actions = ['Confirm Dates', 'Calculate Total Quote', 'Lock In Reservation'];
    } else {
      reply = `I'd be thrilled to assist you with booking! 🏡 Which stay would you like to reserve?\n\n1. 🌴 **Casa Azul Villa** (Anjuna — Private Pool, 6 Guests)\n2. 🏔️ **Cedar Peak Chalet** (Manali — Mountain View, 6 Guests)\n3. 🏛️ **Haveli Heritage Stay** (Jaipur — Royal Suite, 3 Guests)\n4. 🏙️ **The Skyline Penthouse** (Mumbai — City View, 4 Guests)`;
      actions = ['Book Casa Azul', 'Book Cedar Chalet', 'Book Haveli Stay', 'Book Skyline Penthouse'];
    }
  } else if (lower.includes('available') || lower.includes('free') || lower.includes('dates') || lower.includes('oct') || lower.includes('sep') || lower.includes('weekend')) {
    intent = 'check_availability';
    status = 'checking';
    reply = `Great news! 📅 We have prime openings for the upcoming dates across our portfolio.\n\n• **Casa Azul** (Anjuna): Available for family/group getaways\n• **Cedar Peak Chalet** (Manali): Open mountain dates\n• **Haveli Heritage Stay** (Jaipur): Available with artisan breakfast\n• **The Skyline Penthouse** (Mumbai): Open dates\n\nWhich dates and destination suit your trip?`;
    actions = ['Upcoming Weekend', 'Next Month', 'View Rates'];
  } else if (lower.includes('price') || lower.includes('rate') || lower.includes('cost') || lower.includes('how much')) {
    intent = 'price_inquiry';
    reply = `Here are our exclusive direct-booking rates (save 15-20% on platform fees! 💰):\n\n🌴 **Casa Azul Villa** (Anjuna) — ₹4,500/night (Private Pool, 6 Guests)\n🏔️ **Cedar Peak Chalet** (Manali) — ₹5,800/night (Mountain Views, 6 Guests)\n🏛️ **Haveli Heritage Stay** (Jaipur) — ₹3,200/night (Free Breakfast, 3 Guests)\n🏙️ **The Skyline Penthouse** (Mumbai) — ₹7,500/night (City Panoramic, 4 Guests)\n\nSpecial rates apply for 4+ night stays! Shall I prepare a quote for your dates?`;
    actions = ['Calculate Quote', 'Check Availability', 'Ask Amenities'];
  } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('start')) {
    intent = 'general';
    reply = `Welcome to Wayzyy Guest Concierge! 🏡✨\n\nI'm your 24/7 AI booking assistant. I can help you check real-time availability, get special direct-booking rates, or reserve your vacation stay in seconds.\n\nWhich destination or property would you like to explore?`;
    actions = ['Check Availability', 'View Stays & Rates', 'Recommend a Stay'];
  } else {
    intent = 'general';
    reply = `Got it! I can help you explore our verified vacation stays, check live availability, or lock in direct reservation rates.\n\nWould you like to check dates for Beach Villas (Casa Azul), Mountain Chalets (Cedar Peak), Heritage Havelis, or City Penthouses?`;
    actions = ['Beach Villa (Anjuna)', 'Mountain Chalet (Manali)', 'Heritage Stay (Jaipur)', 'City Loft (Mumbai)'];
  }

  conv.messages.push({ role: 'assistant', content: reply });
  conv.context.status = status;

  return {
    reply,
    intent,
    extractedData: conv.context,
    suggestedActions: actions,
    bookingStatus: status,
    conversationId
  };
}

function getConversationState(conversationId = 'default') {
  const conv = getConversation(conversationId);
  return {
    conversationId,
    messages: conv.messages,
    context: conv.context,
    createdAt: conv.createdAt
  };
}

function resetConversation(conversationId = 'default') {
  conversations.delete(conversationId);
  return { success: true, message: `Conversation ${conversationId} reset.` };
}

module.exports = { processMessage, getConversationState, resetConversation };
