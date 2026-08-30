const { chatWithHistory } = require('./anthropicClient');

const SYSTEM_PROMPT = `You are a friendly, knowledgeable WhatsApp booking concierge for Wayzyy, a boutique rental platform in Goa, India. You help guests discover, inquire about, and seamlessly book vacation stays listed by local hosts.

You manage inquiries and reservations for these 3 properties:
1. Casa Azul — 2BHK Portuguese Villa in Anjuna (₹4,500/night). Amenities: Private Pool, AC, WiFi, Kitchen, Parking. Max 6 guests.
2. Pinto's Heritage Stay — Heritage Suite in Fontainhas, Panaji (₹2,800/night). Amenities: AC, High-Speed WiFi, Homemade Breakfast. Max 2 guests.
3. Sunset Shack — Beachfront Eco-Hut in Palolem (₹1,800/night). Amenities: High-Speed WiFi, Direct Sea View, Hammocks. Max 2 guests.

Your Responsibilities:
1. Understand what the guest is asking (check availability, price quote, property recommendations, book reservation, or general Goan travel questions).
2. Extract key booking data: check-in date, check-out date, number of guests, preferred property name or location.
3. Provide warm, polite, and conversational responses in natural Indian English (polite, welcoming, with appropriate Goan hospitality vibes).
4. Guide guests smoothly through the booking journey: inquiry → availability check → price confirmation → ready to book → booking confirmed.

ALWAYS respond strictly with this JSON format (no markdown fences, no extra text):
{
  "reply": "Your friendly conversational response to the guest",
  "intent": "check_availability|book|cancel|price_inquiry|recommendation|general",
  "extractedData": {
    "checkIn": "YYYY-MM-DD or text or null",
    "checkOut": "YYYY-MM-DD or text or null",
    "guests": 2,
    "property": "Casa Azul|Pinto's Heritage Stay|Sunset Shack|null",
    "location": "Anjuna|Fontainhas|Palolem|null"
  },
  "suggestedActions": ["Check Dates", "Book Now", "View Casa Azul"],
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
        suggestedActions: parsed.suggestedActions || ['View Properties', 'Check Availability', 'Ask Pricing'],
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
  if (lower.includes('casa azul') || lower.includes('anjuna') || lower.includes('villa')) {
    conv.context.property = 'Casa Azul';
    conv.context.location = 'Anjuna';
  } else if (lower.includes('pinto') || lower.includes('fontainhas') || lower.includes('heritage')) {
    conv.context.property = "Pinto's Heritage Stay";
    conv.context.location = 'Fontainhas';
  } else if (lower.includes('sunset') || lower.includes('palolem') || lower.includes('shack') || lower.includes('beach hut')) {
    conv.context.property = 'Sunset Shack';
    conv.context.location = 'Palolem';
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
      reply = `Awesome! 🌴 I'd love to reserve **${conv.context.property}** for you.\n\nCould you please confirm your check-in & check-out dates and guest count? I will lock in the dates with host Rajesh right away! ✨`;
      actions = ['Confirm Dates', 'Calculate Total', 'Contact Host'];
    } else {
      reply = `I'd be thrilled to help you book! 🏡 Which property would you like to stay at?\n\n1. **Casa Azul** (2BHK Villa in Anjuna with Pool — ₹4,500/night)\n2. **Pinto's Heritage Stay** (Fontainhas Suite with Breakfast — ₹2,800/night)\n3. **Sunset Shack** (Palolem Beachfront Hut — ₹1,800/night)`;
      actions = ['Book Casa Azul', "Book Pinto's", 'Book Sunset Shack'];
    }
  } else if (lower.includes('available') || lower.includes('free') || lower.includes('dates') || lower.includes('oct') || lower.includes('sep') || lower.includes('weekend')) {
    intent = 'check_availability';
    status = 'checking';
    reply = `Great news! 📅 We have prime openings for the upcoming dates.\n\n• **Casa Azul** (Anjuna): Available for up to 6 guests\n• **Pinto's Heritage Stay** (Fontainhas): Available for 2 guests\n• **Sunset Shack** (Palolem): Beachfront dates open\n\nWhich dates work best for your Goa getaway?`;
    actions = ['Next Weekend', 'This Month', 'Casa Azul Rates'];
  } else if (lower.includes('price') || lower.includes('rate') || lower.includes('cost') || lower.includes('how much')) {
    intent = 'price_inquiry';
    reply = `Here are our direct host rates (no hidden booking fees! 💰):\n\n🏡 **Casa Azul** (Anjuna) — ₹4,500/night (Private Pool, 6 Guests)\n🏛️ **Pinto's Heritage Stay** (Fontainhas) — ₹2,800/night (Free Breakfast, 2 Guests)\n🏖️ **Sunset Shack** (Palolem) — ₹1,800/night (Sea View, 2 Guests)\n\nDiscounts apply for stays of 4+ nights! Shall I calculate a quote for your dates?`;
    actions = ['Calculate Quote', 'Check Availability', 'Ask Amenities'];
  } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('start')) {
    intent = 'general';
    reply = `Namaste & Welcome to Wayzyy Goa! 🌴✨\n\nI'm your 24/7 AI booking assistant for local host Rajesh. I can help you check real-time availability, get special direct-booking rates, or reserve your stay instantly.\n\nHow can I help you today?`;
    actions = ['Check Availability', 'View Pricing', 'Recommend a Stay'];
  } else {
    intent = 'general';
    reply = `Got it! I can help you explore our verified Goa properties, check live availability, or lock in direct reservation rates.\n\nWould you like to check dates for Anjuna (Casa Azul), Fontainhas (Pinto's), or Palolem Beach (Sunset Shack)?`;
    actions = ['Casa Azul (Anjuna)', 'Heritage Fontainhas', 'Sunset Shack (Palolem)'];
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
