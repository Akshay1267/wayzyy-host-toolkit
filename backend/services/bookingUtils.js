/**
 * Booking Utilities for WhatsApp Concierge
 * 
 * Handles property resolution, date availability, booking creation,
 * natural date parsing, and confirmation message formatting.
 */

const { getDb } = require('../db/db');
const { suggestPrice } = require('./pricingEngine');

// ─── Property Resolution ───────────────────────────────────────────

/**
 * Fuzzy-match a guest's text to a property in the database.
 * Matches against property name, location, and type keywords.
 * @param {string} query - The user's text mentioning a property
 * @returns {object|null} The matched property row, or null
 */
function resolvePropertyByName(query) {
  if (!query) return null;
  const db = getDb();
  const lower = query.toLowerCase().trim();

  // Try exact/partial name match first
  const allProperties = db.prepare('SELECT * FROM properties').all();

  // Score each property by match relevance
  let bestMatch = null;
  let bestScore = 0;

  for (const prop of allProperties) {
    let score = 0;
    const propName = prop.name.toLowerCase();
    const propLoc = prop.location.toLowerCase();
    const propType = prop.property_type.toLowerCase();

    // Exact name match
    if (lower.includes(propName) || propName.includes(lower)) {
      score += 100;
    }

    // Partial name word matches
    const nameWords = propName.split(/\s+/);
    for (const word of nameWords) {
      if (word.length > 2 && lower.includes(word)) {
        score += 25;
      }
    }

    // Location match
    const locWords = propLoc.split(/[\s,]+/);
    for (const word of locWords) {
      if (word.length > 2 && lower.includes(word)) {
        score += 20;
      }
    }

    // Property type match
    if (lower.includes(propType)) {
      score += 15;
    }

    // Keyword associations
    const keywords = {
      'pool': ['pool', 'swimming'],
      'mountain': ['mountain', 'hill', 'peak', 'chalet', 'himalaya', 'manali'],
      'heritage': ['heritage', 'haveli', 'royal', 'palace', 'jaipur'],
      'penthouse': ['penthouse', 'skyline', 'city', 'loft', 'mumbai', 'bandra'],
      'beach': ['beach', 'coastal', 'sea', 'goa', 'anjuna'],
      'villa': ['villa', 'casa']
    };

    const propAmenities = JSON.parse(prop.amenities || '[]');
    for (const [key, terms] of Object.entries(keywords)) {
      if (terms.some(t => lower.includes(t))) {
        if (propName.includes(key) || propLoc.includes(key) || propType.includes(key) || propAmenities.includes(key)) {
          score += 15;
        }
        // Also match by location
        if (terms.some(t => propLoc.includes(t) || propName.includes(t))) {
          score += 10;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = prop;
    }
  }

  // Require a minimum relevance score
  if (bestScore >= 15) {
    // Parse JSON fields
    bestMatch.amenities = JSON.parse(bestMatch.amenities || '[]');
    bestMatch.image_urls = JSON.parse(bestMatch.image_urls || '[]');
    return bestMatch;
  }

  return null;
}

/**
 * Get all properties for listing.
 * @returns {Array} All properties
 */
function getAllProperties() {
  const db = getDb();
  return db.prepare('SELECT * FROM properties').all().map(p => ({
    ...p,
    amenities: JSON.parse(p.amenities || '[]'),
    image_urls: JSON.parse(p.image_urls || '[]')
  }));
}

// ─── Date Parsing ──────────────────────────────────────────────────

/**
 * Parse natural date text into YYYY-MM-DD format.
 * Handles: "Oct 15", "15th October", "next weekend", "tomorrow",
 * "2026-10-15", "10/15", "next friday", etc.
 * @param {string} text - Natural date text
 * @returns {string|null} ISO date string or null
 */
function parseDateNatural(text) {
  if (!text) return null;
  const cleaned = text.trim().toLowerCase();

  // Already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  const now = new Date();
  const currentYear = now.getFullYear();

  // "tomorrow"
  if (cleaned === 'tomorrow') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return formatDate(d);
  }

  // "today"
  if (cleaned === 'today') {
    return formatDate(now);
  }

  // "next weekend" / "this weekend"
  if (cleaned.includes('weekend')) {
    const d = new Date(now);
    const day = d.getDay();
    const daysUntilSat = day === 0 ? 6 : (6 - day);
    const offset = cleaned.includes('next') ? daysUntilSat + 7 : daysUntilSat;
    d.setDate(d.getDate() + offset);
    return formatDate(d);
  }

  // Day names: "next friday", "this monday"
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < dayNames.length; i++) {
    if (cleaned.includes(dayNames[i])) {
      const d = new Date(now);
      const currentDay = d.getDay();
      let daysAhead = i - currentDay;
      if (daysAhead <= 0 || cleaned.includes('next')) daysAhead += 7;
      d.setDate(d.getDate() + daysAhead);
      return formatDate(d);
    }
  }

  // Month name patterns: "Oct 15", "15th October", "October 15"
  const months = {
    'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
    'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5,
    'jul': 6, 'july': 6, 'aug': 7, 'august': 7, 'sep': 8, 'september': 8,
    'oct': 9, 'october': 9, 'nov': 10, 'november': 10, 'dec': 11, 'december': 11
  };

  // "Oct 15" or "October 15th"
  const monthFirst = cleaned.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/);
  if (monthFirst && months[monthFirst[1]] !== undefined) {
    const month = months[monthFirst[1]];
    const day = parseInt(monthFirst[2]);
    let year = currentYear;
    if (new Date(year, month, day) < now) year++;
    return formatDate(new Date(year, month, day));
  }

  // "15 Oct" or "15th October"
  const dayFirst = cleaned.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)/);
  if (dayFirst && months[dayFirst[2]] !== undefined) {
    const day = parseInt(dayFirst[1]);
    const month = months[dayFirst[2]];
    let year = currentYear;
    if (new Date(year, month, day) < now) year++;
    return formatDate(new Date(year, month, day));
  }

  // "MM/DD" or "DD/MM" — assume MM/DD
  const slashDate = cleaned.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slashDate) {
    let month = parseInt(slashDate[1]) - 1;
    let day = parseInt(slashDate[2]);
    let year = slashDate[3] ? parseInt(slashDate[3]) : currentYear;
    if (year < 100) year += 2000;
    return formatDate(new Date(year, month, day));
  }

  // "in X days"
  const inDays = cleaned.match(/in\s+(\d+)\s+days?/);
  if (inDays) {
    const d = new Date(now);
    d.setDate(d.getDate() + parseInt(inDays[1]));
    return formatDate(d);
  }

  return null;
}

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Availability Checking ─────────────────────────────────────────

/**
 * Check if a property is available for the given date range.
 * Looks for overlapping confirmed/pending bookings.
 * @param {number} propertyId
 * @param {string} checkIn - YYYY-MM-DD
 * @param {string} checkOut - YYYY-MM-DD
 * @returns {{ available: boolean, conflicts: Array }}
 */
function checkDateAvailability(propertyId, checkIn, checkOut) {
  const db = getDb();

  const conflicts = db.prepare(`
    SELECT id, guest_name, check_in, check_out, status
    FROM bookings
    WHERE property_id = ?
      AND status IN ('confirmed', 'pending')
      AND check_in < ?
      AND check_out > ?
  `).all(propertyId, checkOut, checkIn);

  return {
    available: conflicts.length === 0,
    conflicts
  };
}

// ─── Booking Creation ──────────────────────────────────────────────

/**
 * Create a booking from the WhatsApp conversation context.
 * Uses the pricing engine for dynamic rate calculation.
 * 
 * @param {object} params
 * @param {number} params.propertyId
 * @param {string} params.guestName
 * @param {string} params.guestPhone
 * @param {string} params.checkIn - YYYY-MM-DD
 * @param {string} params.checkOut - YYYY-MM-DD
 * @param {number} params.guests
 * @returns {{ success: boolean, booking?: object, error?: string }}
 */
function createBookingFromWhatsApp({ propertyId, guestName, guestPhone, checkIn, checkOut, guests }) {
  const db = getDb();

  // Fetch property
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);
  if (!property) {
    return { success: false, error: 'Property not found' };
  }

  // Validate dates
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
    return { success: false, error: 'Invalid dates provided' };
  }
  if (outDate <= inDate) {
    return { success: false, error: 'Check-out must be after check-in' };
  }

  const nights = Math.max(Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)), 1);

  // Check availability
  const availability = checkDateAvailability(propertyId, checkIn, checkOut);
  if (!availability.available) {
    return {
      success: false,
      error: `Property is already booked for those dates (${availability.conflicts.length} overlapping booking${availability.conflicts.length > 1 ? 's' : ''})`
    };
  }

  // Calculate dynamic pricing
  const amenities = JSON.parse(property.amenities || '[]');
  const pricing = suggestPrice({
    baseRate: property.base_rate,
    propertyType: property.property_type,
    location: property.location,
    bedrooms: property.bedrooms,
    amenities,
    checkIn
  });

  const nightlyRate = pricing.mid;
  const totalAmount = nightlyRate * nights;

  // Insert booking
  const stmt = db.prepare(`
    INSERT INTO bookings (property_id, guest_name, guest_phone, check_in, check_out, guests, total_amount, nightly_rate, status, source, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'whatsapp', ?)
  `);

  const result = stmt.run(
    propertyId,
    guestName || 'WhatsApp Guest',
    guestPhone || '',
    checkIn,
    checkOut,
    guests || 2,
    totalAmount,
    nightlyRate,
    `Booked via WhatsApp concierge on ${new Date().toISOString().split('T')[0]}`
  );

  const bookingId = result.lastInsertRowid;

  return {
    success: true,
    booking: {
      id: bookingId,
      propertyId,
      propertyName: property.name,
      location: property.location,
      checkIn,
      checkOut,
      nights,
      guests: guests || 2,
      nightlyRate,
      totalAmount,
      status: 'confirmed',
      source: 'whatsapp',
      guestName: guestName || 'WhatsApp Guest',
      guestPhone: guestPhone || ''
    }
  };
}

// ─── Confirmation Message Formatting ───────────────────────────────

/**
 * Generate a WhatsApp-friendly booking confirmation message.
 * @param {object} booking - Booking object from createBookingFromWhatsApp
 * @returns {string} Formatted confirmation text
 */
function formatBookingConfirmation(booking) {
  const checkInDate = new Date(booking.checkIn);
  const checkOutDate = new Date(booking.checkOut);

  const formatDisplayDate = (d) => {
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-IN', options);
  };

  return `🎉 *BOOKING CONFIRMED!*

━━━━━━━━━━━━━━━━━━━━
📋 *Booking #${booking.id}*
━━━━━━━━━━━━━━━━━━━━

🏡 *${booking.propertyName}*
📍 ${booking.location}

📅 Check-in:  ${formatDisplayDate(checkInDate)}
📅 Check-out: ${formatDisplayDate(checkOutDate)}
🌙 ${booking.nights} Night${booking.nights > 1 ? 's' : ''}
👥 ${booking.guests} Guest${booking.guests > 1 ? 's' : ''}

💰 *₹${booking.nightlyRate.toLocaleString('en-IN')}/night*
💵 *Total: ₹${booking.totalAmount.toLocaleString('en-IN')}*

━━━━━━━━━━━━━━━━━━━━
✅ Status: *Confirmed*
📱 Booked via: WhatsApp Direct
💳 Save 15-20% on OTA fees!

Thank you for booking directly with us! Your host will reach out shortly with check-in instructions. 🙏`;
}

/**
 * Generate a price quote message before booking confirmation.
 * @param {object} property - Property from DB
 * @param {object} pricing - Pricing result from suggestPrice
 * @param {string} checkIn
 * @param {string} checkOut
 * @param {number} guests
 * @returns {string}
 */
function formatPriceQuote(property, pricing, checkIn, checkOut, guests) {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const nights = Math.max(Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)), 1);
  const total = pricing.mid * nights;

  const formatDisplayDate = (d) => {
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return d.toLocaleDateString('en-IN', options);
  };

  return `🏡 *${property.name}*
📍 ${property.location}

📅 ${formatDisplayDate(inDate)} → ${formatDisplayDate(outDate)} (${nights} night${nights > 1 ? 's' : ''})
👥 ${guests || 2} guest${(guests || 2) > 1 ? 's' : ''}

💰 *₹${pricing.mid.toLocaleString('en-IN')}/night*
💵 *Estimated Total: ₹${total.toLocaleString('en-IN')}*

${pricing.season ? `📊 Season: ${pricing.season}` : ''}

✨ Direct booking saves you 15-20% compared to OTA platforms!

Would you like to confirm this reservation?`;
}

module.exports = {
  resolvePropertyByName,
  getAllProperties,
  parseDateNatural,
  checkDateAvailability,
  createBookingFromWhatsApp,
  formatBookingConfirmation,
  formatPriceQuote
};
