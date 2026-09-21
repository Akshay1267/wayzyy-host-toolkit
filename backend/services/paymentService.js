/**
 * Payment Service for Wayzyy Bookings
 * 
 * Handles UPI link generation, QR code generation, payment checkout details,
 * payment confirmation, and automated WhatsApp receipt notifications.
 */

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { getDb } = require('../db/db');
const { sendTextMessage, sendInteractiveButtons } = require('./whatsappClient');

/**
 * Get current public URL for checkout links.
 * Prefers Cloudflare tunnel URL if active, falls back to localhost.
 */
function getPublicUrl() {
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.replace(/\/$/, '');
  }

  const tunnelFile = path.join(__dirname, '..', '.tunnel_url');
  if (fs.existsSync(tunnelFile)) {
    try {
      const url = fs.readFileSync(tunnelFile, 'utf8').trim();
      if (url.startsWith('http')) {
        return url.replace(/\/$/, '');
      }
    } catch (_) {}
  }

  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
}

/**
 * Generate UPI deep link and checkout web link for a booking.
 */
async function generatePaymentDetails(booking) {
  const publicUrl = getPublicUrl();
  const paymentUrl = `${publicUrl}/pay/${booking.id}`;
  const amount = Number(booking.total_amount || 0);

  // Standard NPCI / UPI deep link format
  const upiLink = `upi://pay?pa=wayzyy.stays@upi&pn=Wayzyy+Luxury+Stays&am=${amount.toFixed(2)}&cu=INR&tn=Booking-${booking.id}`;

  // Generate QR Code data URL
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(upiLink, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
      color: {
        dark: '#1e1b18',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate UPI QR code:', err.message);
  }

  return {
    paymentUrl,
    upiLink,
    qrCodeDataUrl,
    amount,
    currency: 'INR'
  };
}

/**
 * Fetch detailed booking information for the checkout page.
 */
function getBookingForCheckout(bookingId) {
  const db = getDb();
  const booking = db.prepare(`
    SELECT 
      b.*,
      p.name as property_name,
      p.location as property_location,
      p.property_type,
      p.image_urls,
      p.amenities
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    WHERE b.id = ?
  `).get(bookingId);

  if (!booking) return null;

  let images = [];
  try { images = JSON.parse(booking.image_urls || '[]'); } catch (_) {}

  let amenities = [];
  try { amenities = JSON.parse(booking.amenities || '[]'); } catch (_) {}

  return {
    ...booking,
    image_url: images[0] || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
    amenities
  };
}

/**
 * Confirm payment, update database record, and send WhatsApp confirmation receipt.
 */
async function confirmBookingPayment(bookingId, paymentData = {}) {
  const db = getDb();
  const booking = getBookingForCheckout(bookingId);

  if (!booking) {
    throw new Error('Booking not found');
  }

  const transactionId = paymentData.transactionId || `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const method = paymentData.method || 'UPI (Instant)';
  const now = new Date().toISOString();

  // Update DB
  db.prepare(`
    UPDATE bookings 
    SET payment_status = 'paid',
        status = 'confirmed',
        payment_id = ?,
        paid_at = ?
    WHERE id = ?
  `).run(transactionId, now, bookingId);

  console.log(`💳 Payment confirmed for Booking #${bookingId}: ${transactionId} via ${method}`);

  // Send WhatsApp Payment Receipt if phone number is present
  if (booking.guest_phone) {
    try {
      const receiptMessage = formatPaymentReceiptMessage({
        ...booking,
        transactionId,
        paymentMethod: method,
        paidAt: now
      });

      await sendTextMessage(booking.guest_phone, receiptMessage);

      // Follow-up interactive buttons
      await new Promise(r => setTimeout(r, 800));
      await sendInteractiveButtons(
        booking.guest_phone,
        `Your stay at ${booking.property_name} is fully confirmed and paid! What would you like to do?`,
        [
          { id: `directions_${bookingId}`, title: '📍 Get Directions' },
          { id: `guidebook_${bookingId}`, title: '📖 Local Guide' },
          { id: `host_${bookingId}`, title: '📞 Contact Host' }
        ]
      );
    } catch (err) {
      console.warn(`Could not send WhatsApp payment receipt to ${booking.guest_phone}:`, err.message);
    }
  }

  return {
    success: true,
    bookingId,
    transactionId,
    amount: booking.total_amount,
    status: 'paid'
  };
}

/**
 * Formats a clean, high-conversion WhatsApp receipt message after payment.
 */
function formatPaymentReceiptMessage(data) {
  const formattedAmount = Number(data.total_amount).toLocaleString('en-IN');
  const checkInStr = new Date(data.check_in).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
  const checkOutStr = new Date(data.check_out).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });

  return `✅ *PAYMENT CONFIRMED — RESERVATION SECURED!*

📋 *Booking ID:* #${data.id}
💳 *Transaction ID:* ${data.transactionId}
💵 *Amount Paid:* ₹${formattedAmount} (${data.paymentMethod})
━━━━━━━━━━━━━━━━━━━━
🏡 *${data.property_name}*
📍 *Location:* ${data.property_location}
📅 *Check-in:* ${checkInStr} (from 2:00 PM)
📅 *Check-out:* ${checkOutStr} (until 11:00 AM)
👥 *Guests:* ${data.guests}
━━━━━━━━━━━━━━━━━━━━
🔒 *Your reservation is 100% locked in!*
Direct booking with Wayzyy saves you 15–20% in OTA platform commissions.

🚪 *Self Check-in Pass:*
Door access code and property manager contact details will be sent 24 hours prior to check-in.

Need anything before your stay? Just reply here anytime!`;
}

module.exports = {
  getPublicUrl,
  generatePaymentDetails,
  getBookingForCheckout,
  confirmBookingPayment,
  formatPaymentReceiptMessage
};
