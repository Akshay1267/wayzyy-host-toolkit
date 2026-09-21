/**
 * Payments & Checkout Routes for Wayzyy Stays
 * 
 * GET  /pay/:bookingId          — Hosted luxury checkout page
 * GET  /api/payments/:bookingId — Booking checkout & UPI QR data
 * POST /api/payments/confirm   — Confirms payment and fires WhatsApp receipt
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const {
  getBookingForCheckout,
  generatePaymentDetails,
  confirmBookingPayment
} = require('../services/paymentService');

/**
 * Serve the luxury checkout web interface
 */
router.get('/pay/:bookingId', (req, res) => {
  const filePath = path.join(__dirname, '..', 'public', 'checkout.html');
  res.sendFile(filePath);
});

/**
 * API: Get booking payment info (amounts, QR code, UPI intent link)
 */
router.get('/api/payments/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = getBookingForCheckout(bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const paymentDetails = await generatePaymentDetails(booking);

    res.json({
      success: true,
      booking,
      payment: paymentDetails
    });
  } catch (err) {
    console.error('Error fetching payment details:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * API: Confirm payment settlement (called on successful checkout or simulated payment)
 */
router.post('/api/payments/confirm', async (req, res) => {
  try {
    const { bookingId, method, transactionId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'Missing bookingId' });
    }

    const result = await confirmBookingPayment(bookingId, {
      method: method || 'UPI Instant Pay',
      transactionId: transactionId || `UPI_${Date.now()}`
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('Error confirming payment:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
