const { chatWithHistory } = require('./anthropicClient');
const { getDb } = require('../db/db');
const {
  resolvePropertyByName,
  getAllProperties,
  parseDateNatural,
  checkDateAvailability,
  createBookingFromWhatsApp,
  formatBookingConfirmation,
  formatPriceQuote
} = require('./bookingUtils');
const { suggestPrice } = require('./pricingEngine');

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
2. Extract key booking data: check-in date (ALWAYS in YYYY-MM-DD format), check-out date (ALWAYS in YYYY-MM-DD format), number of guests, preferred property name or location.
3. Provide warm, polite, and conversational responses in natural, welcoming hospitality English.
4. Guide guests smoothly through the booking journey: inquiry → availability check → price confirmation → ready to book → booking confirmed.
5. When a guest explicitly confirms they want to book (says "yes", "confirm", "book it", "let's do it", "go ahead"), set confirmBooking to true and bookingStatus to "confirmed".
6. NEVER set confirmBooking to true unless the guest has explicitly agreed to book after seeing a price or availability.
7. When extracting dates, ALWAYS convert to YYYY-MM-DD format. Today's date is ${new Date().toISOString().split('T')[0]}. Use this to resolve relative dates like "next weekend", "tomorrow", etc.

ALWAYS respond strictly with this JSON format (no markdown fences, no extra text):
{
  "reply": "Your friendly conversational response to the guest",
  "intent": "check_availability|book|cancel|price_inquiry|recommendation|general",
  "extractedData": {
    "checkIn": "YYYY-MM-DD or null",
    "checkOut": "YYYY-MM-DD or null",
    "guests": 2,
    "property": "property name or null",
    "location": "location name or null"
  },
  "suggestedActions": ["Check Dates", "Book Now", "View Stays"],
  "bookingStatus": "inquiry|checking|ready_to_book|confirmed|null",
  "confirmBooking": false
}`;

// In-memory conversation store for multi-turn sessions
const conversations = new Map();

function getConversation(conversationId = 'default') {
  if (!conversations.has(conversationId)) {
    conversations.set(conversationId, {
      messages: [],
      context: {
        property: null,
        propertyId: null,
        location: null,
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

/**
 * Try to resolve and enrich context with actual DB property data.
 */
function enrichContextWithProperty(context) {
  if (context.propertyId) return context; // Already resolved

  const searchText = [context.property, context.location].filter(Boolean).join(' ');
  if (!searchText) return context;

  const resolved = resolvePropertyByName(searchText);
  if (resolved) {
    context.propertyId = resolved.id;
    context.property = resolved.name;
    context.location = resolved.location;
    context.resolvedProperty = resolved;
  }
  return context;
}

/**
 * Attempt to create a booking if all conditions are met.
 * Returns booking result or null.
 */
function tryCreateBooking(context, senderPhone, senderName) {
  // Resolve property if not yet done
  enrichContextWithProperty(context);

  if (!context.propertyId || !context.checkIn || !context.checkOut) {
    return null;
  }

  // Parse dates if they're natural text
  const checkIn = parseDateNatural(context.checkIn) || context.checkIn;
  const checkOut = parseDateNatural(context.checkOut) || context.checkOut;

  // Validate dates are in ISO format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    return { success: false, error: 'Could not parse dates. Please provide dates like "Oct 15" or "2026-10-15".' };
  }

  const result = createBookingFromWhatsApp({
    propertyId: context.propertyId,
    guestName: senderName || 'WhatsApp Guest',
    guestPhone: senderPhone || '',
    checkIn,
    checkOut,
    guests: context.guests || 2
  });

  return result;
}

/**
 * Generate a price quote for the current context.
 */
function generatePriceQuote(context) {
  enrichContextWithProperty(context);

  if (!context.resolvedProperty || !context.checkIn) return null;

  const property = context.resolvedProperty;
  const checkIn = parseDateNatural(context.checkIn) || context.checkIn;
  const checkOut = parseDateNatural(context.checkOut) || context.checkOut;

  const amenities = Array.isArray(property.amenities) ? property.amenities : JSON.parse(property.amenities || '[]');
  const pricing = suggestPrice({
    baseRate: property.base_rate,
    propertyType: property.property_type,
    location: property.location,
    bedrooms: property.bedrooms,
    amenities,
    checkIn
  });

  return {
    property,
    pricing,
    checkIn,
    checkOut,
    quoteText: formatPriceQuote(property, pricing, checkIn, checkOut, context.guests)
  };
}

async function processMessage(conversationId = 'default', userMessage = '') {
  const conv = getConversation(conversationId);
  conv.messages.push({ role: 'user', content: userMessage });

  const llmResponse = await chatWithHistory(SYSTEM_PROMPT, conv.messages, { maxTokens: 800 });

  if (llmResponse) {
    try {
      const cleaned = llmResponse.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
      const parsed = JSON.parse(cleaned);

      // Merge extracted data into conversation context
      if (parsed.extractedData) {
        if (parsed.extractedData.property) conv.context.property = parsed.extractedData.property;
        if (parsed.extractedData.location) conv.context.location = parsed.extractedData.location;
        if (parsed.extractedData.checkIn) conv.context.checkIn = parsed.extractedData.checkIn;
        if (parsed.extractedData.checkOut) conv.context.checkOut = parsed.extractedData.checkOut;
        if (parsed.extractedData.guests) conv.context.guests = parsed.extractedData.guests;
      }
      if (parsed.bookingStatus) {
        conv.context.status = parsed.bookingStatus;
      }

      // Resolve property from DB
      enrichContextWithProperty(conv.context);

      let reply = parsed.reply || llmResponse;
      let bookingResult = null;

      // ── Handle booking confirmation ──
      if (parsed.confirmBooking === true || parsed.bookingStatus === 'confirmed') {
        bookingResult = tryCreateBooking(conv.context, conversationId, null);

        if (bookingResult && bookingResult.success) {
          // Booking created successfully
          const confirmation = formatBookingConfirmation(bookingResult.booking);
          reply = confirmation;
          conv.context.status = 'confirmed';
          conv.context.bookingId = bookingResult.booking.id;
        } else if (bookingResult && !bookingResult.success) {
          // Booking failed (dates unavailable, etc.)
          reply = `I'm sorry, I couldn't complete the booking: ${bookingResult.error}\n\nWould you like to try different dates?`;
          conv.context.status = 'checking';
        } else {
          // Missing required info
          const missing = [];
          if (!conv.context.propertyId && !conv.context.property) missing.push('property name');
          if (!conv.context.checkIn) missing.push('check-in date');
          if (!conv.context.checkOut) missing.push('check-out date');

          if (missing.length > 0) {
            reply = `I'd love to confirm your booking! 😊 Just need a few more details:\n\n${missing.map(m => `• ${m.charAt(0).toUpperCase() + m.slice(1)}`).join('\n')}\n\nCould you share these so I can finalize your reservation?`;
            conv.context.status = 'ready_to_book';
          }
        }
      }

      // ── Handle price inquiry / ready_to_book — generate real quote ──
      else if (
        (parsed.bookingStatus === 'ready_to_book' || parsed.intent === 'price_inquiry' || parsed.intent === 'check_availability') &&
        conv.context.property && conv.context.checkIn
      ) {
        const quote = generatePriceQuote(conv.context);
        if (quote) {
          // Check availability
          const checkIn = parseDateNatural(conv.context.checkIn) || conv.context.checkIn;
          const checkOut = parseDateNatural(conv.context.checkOut) || conv.context.checkOut;

          if (conv.context.propertyId && checkIn && checkOut) {
            const availability = checkDateAvailability(conv.context.propertyId, checkIn, checkOut);
            if (!availability.available) {
              reply = `Unfortunately, ${conv.context.property} is not available for ${checkIn} to ${checkOut} as there's an existing booking.\n\nWould you like to try different dates or explore another property?`;
              conv.context.status = 'checking';
            } else {
              reply = quote.quoteText;
              conv.context.status = 'ready_to_book';
            }
          }
        }
      }

      conv.messages.push({ role: 'assistant', content: reply });

      return {
        reply,
        intent: parsed.intent || 'general',
        extractedData: conv.context,
        suggestedActions: parsed.suggestedActions || ['View Stays', 'Check Availability', 'Ask Pricing'],
        bookingStatus: conv.context.status || 'inquiry',
        bookingResult: bookingResult && bookingResult.success ? bookingResult.booking : null,
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
        bookingResult: null,
        conversationId
      };
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Domain-specific rule-based fallback (no LLM available)
  // ══════════════════════════════════════════════════════════════════
  const lower = userMessage.toLowerCase();
  let intent = 'general';
  let reply = '';
  let actions = [];
  let status = conv.context.status || 'inquiry';
  let bookingResult = null;

  // ── Extract property via DB fuzzy match ──
  const resolvedProp = resolvePropertyByName(userMessage);
  if (resolvedProp) {
    conv.context.property = resolvedProp.name;
    conv.context.propertyId = resolvedProp.id;
    conv.context.location = resolvedProp.location;
    conv.context.resolvedProperty = resolvedProp;
  }

  // ── Extract guest count ──
  const guestMatch = lower.match(/(\d+)\s*(guest|person|people|adult)/i);
  if (guestMatch) {
    conv.context.guests = parseInt(guestMatch[1], 10);
  }

  // ── Extract dates ──
  // Pattern: "Oct 10-13", "Oct 10 to Oct 13", "10th to 13th October"
  const dateRangeMatch = lower.match(/(\w+\s+\d{1,2})(?:st|nd|rd|th)?\s*[-–to]+\s*(\d{1,2})(?:st|nd|rd|th)?/);
  if (dateRangeMatch) {
    const checkIn = parseDateNatural(dateRangeMatch[1]);
    if (checkIn) {
      conv.context.checkIn = checkIn;
      // Parse check-out as same month
      const inDate = new Date(checkIn);
      const outDay = parseInt(dateRangeMatch[2]);
      const outDate = new Date(inDate.getFullYear(), inDate.getMonth(), outDay);
      conv.context.checkOut = `${outDate.getFullYear()}-${String(outDate.getMonth() + 1).padStart(2, '0')}-${String(outDate.getDate()).padStart(2, '0')}`;
    }
  }

  // Try longer date patterns: "Oct 10 to Oct 13"
  if (!conv.context.checkIn) {
    const fullDateRange = lower.match(/(\w+\s+\d{1,2}(?:st|nd|rd|th)?)\s*(?:to|-|–)\s*(\w+\s+\d{1,2}(?:st|nd|rd|th)?)/);
    if (fullDateRange) {
      const ci = parseDateNatural(fullDateRange[1]);
      const co = parseDateNatural(fullDateRange[2]);
      if (ci) conv.context.checkIn = ci;
      if (co) conv.context.checkOut = co;
    }
  }

  // ── Handle confirm/book intent ──
  if (lower.includes('confirm') || lower.includes('yes') || lower.includes('book it') || lower.includes('go ahead') || lower.includes("let's do it")) {
    if (conv.context.status === 'ready_to_book' && conv.context.propertyId && conv.context.checkIn && conv.context.checkOut) {
      // Actually create the booking
      bookingResult = tryCreateBooking(conv.context, conversationId, null);

      if (bookingResult && bookingResult.success) {
        intent = 'book';
        status = 'confirmed';
        reply = formatBookingConfirmation(bookingResult.booking);
        actions = ['📋 Booking Details', '🏡 View Property', '💬 Contact Host'];
        conv.context.status = 'confirmed';
        conv.context.bookingId = bookingResult.booking.id;
      } else if (bookingResult) {
        reply = `I'm sorry, I couldn't complete the booking: ${bookingResult.error}\n\nWould you like to try different dates?`;
        actions = ['Try Different Dates', 'View Other Stays'];
        status = 'checking';
      }
    }
  }

  if (!reply && (lower.includes('book') || lower.includes('reserve'))) {
    intent = 'book';
    status = 'ready_to_book';

    if (conv.context.property && conv.context.checkIn && conv.context.checkOut) {
      // Have all info — generate price quote
      const quote = generatePriceQuote(conv.context);
      if (quote) {
        reply = quote.quoteText;
        actions = ['✅ Confirm Booking', 'Change Dates', 'View Other Stays'];
      }
    } else if (conv.context.property) {
      reply = `Great choice! 🌟 I'd love to book **${conv.context.property}** (${conv.context.location || 'Vacation Stay'}) for you.\n\nCould you share your preferred check-in & check-out dates and number of guests?`;
      actions = ['Next Weekend', 'This Month', 'View Rates'];
    } else {
      const allProps = getAllProperties();
      reply = `I'd be thrilled to help you book! 🏡 Which stay catches your eye?\n\n${allProps.map((p, i) => `${i + 1}. ${p.property_type === 'villa' ? '🌴' : p.property_type === 'heritage_room' ? '🏛️' : '🏙️'} **${p.name}** (${p.location}) — ₹${p.base_rate.toLocaleString('en-IN')}/night, max ${p.max_guests} guests`).join('\n')}`;
      actions = allProps.slice(0, 3).map(p => p.name);
    }
  }

  if (!reply && (lower.includes('available') || lower.includes('free') || lower.includes('dates') || lower.includes('when'))) {
    intent = 'check_availability';
    status = 'checking';

    if (conv.context.propertyId && conv.context.checkIn && conv.context.checkOut) {
      const availability = checkDateAvailability(conv.context.propertyId, conv.context.checkIn, conv.context.checkOut);
      if (availability.available) {
        const quote = generatePriceQuote(conv.context);
        reply = `Great news! ✅ **${conv.context.property}** is available for your dates!\n\n${quote ? quote.quoteText : `📅 ${conv.context.checkIn} → ${conv.context.checkOut}`}\n\nWould you like to confirm the booking?`;
        actions = ['✅ Confirm Booking', 'Change Dates', 'View Other Stays'];
        status = 'ready_to_book';
      } else {
        reply = `Unfortunately, **${conv.context.property}** is already booked for those dates. 😔\n\nWould you like to try different dates or explore another property?`;
        actions = ['Try Different Dates', 'View All Properties'];
      }
    } else {
      reply = `I'd be happy to check availability! 📅\n\nOur current portfolio:\n${getPropertiesSummary()}\n\nWhich property and dates are you interested in?`;
      actions = ['Next Weekend', 'This Month', 'View Rates'];
    }
  }

  if (!reply && (lower.includes('price') || lower.includes('rate') || lower.includes('cost') || lower.includes('how much'))) {
    intent = 'price_inquiry';

    if (conv.context.propertyId && conv.context.checkIn) {
      const quote = generatePriceQuote(conv.context);
      if (quote) {
        reply = quote.quoteText;
        actions = ['✅ Confirm Booking', 'Change Dates', 'View Other Stays'];
        status = 'ready_to_book';
      }
    }

    if (!reply) {
      const allProps = getAllProperties();
      reply = `Here are our exclusive direct-booking rates (save 15-20% on platform fees! 💰):\n\n${allProps.map(p => `🏡 **${p.name}** (${p.location}) — ₹${p.base_rate.toLocaleString('en-IN')}/night (max ${p.max_guests} guests)`).join('\n')}\n\nSpecial rates for 4+ night stays! Share your dates and I'll calculate an exact quote.`;
      actions = ['Check Availability', 'Book a Stay', 'Learn More'];
    }
  }

  if (!reply && (lower.includes('cancel') || lower.includes('remove'))) {
    intent = 'cancel';

    // Look up recent bookings for this phone/conversation
    try {
      const db = getDb();
      const recentBooking = db.prepare(`
        SELECT b.*, p.name as property_name FROM bookings b
        JOIN properties p ON b.property_id = p.id
        WHERE b.guest_phone = ? AND b.status = 'confirmed'
        ORDER BY b.created_at DESC LIMIT 1
      `).get(conversationId);

      if (recentBooking) {
        db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('cancelled', recentBooking.id);
        reply = `Your booking at **${recentBooking.property_name}** (${recentBooking.check_in} to ${recentBooking.check_out}) has been cancelled. ❌\n\nBooking #${recentBooking.id} — Status: Cancelled\n\nWe hope to host you another time! If you'd like to rebook different dates, just let me know. 🙏`;
        actions = ['Rebook', 'View Stays', 'Contact Host'];
        status = 'inquiry';
      } else {
        reply = `I couldn't find an active booking linked to your number. Could you share the booking details or property name you'd like to cancel?`;
        actions = ['View My Bookings', 'Contact Host'];
      }
    } catch (e) {
      reply = `I'd be happy to help with cancellations. Could you share your booking number or the property name?`;
      actions = ['Contact Host', 'View Stays'];
    }
  }

  if (!reply && (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('start'))) {
    intent = 'general';
    reply = `Welcome to Wayzyy Guest Concierge! 🏡✨\n\nI'm your 24/7 AI booking assistant. I can help you:\n\n✅ Check real-time property availability\n💰 Get instant direct-booking price quotes\n📅 Reserve your vacation stay in seconds\n\nWhich destination or property would you like to explore?`;
    actions = ['Check Availability', 'View Stays & Rates', 'Recommend a Stay'];
  }

  if (!reply) {
    intent = 'general';
    const allProps = getAllProperties();
    reply = `I can help you explore our verified vacation stays, check live availability, or lock in direct reservation rates! 🏡\n\nOur properties:\n${allProps.map(p => `• **${p.name}** — ${p.location}`).join('\n')}\n\nWhat would you like to know?`;
    actions = allProps.slice(0, 3).map(p => p.name).concat(['View Rates']);
  }

  conv.messages.push({ role: 'assistant', content: reply });
  conv.context.status = status;

  return {
    reply,
    intent,
    extractedData: conv.context,
    suggestedActions: actions,
    bookingStatus: status,
    bookingResult: bookingResult && bookingResult.success ? bookingResult.booking : null,
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
