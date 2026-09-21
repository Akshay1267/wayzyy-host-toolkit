/**
 * Payments & Checkout Routes for Wayzyy Stays
 * 
 * GET  /pay/:bookingId                   — Hosted luxury checkout page
 * GET  /api/payments/:bookingId          — Booking checkout & UPI QR data
 * POST /api/payments/confirm            — Confirms simulated payment and fires WhatsApp receipt
 * POST /api/payments/razorpay/create-order — Creates Razorpay order for direct checkout
 * POST /api/payments/razorpay/verify    — Verifies Razorpay signature and fires WhatsApp receipt
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const {
  getBookingForCheckout,
  generatePaymentDetails,
  createRazorpayOrder,
  verifyRazorpayPayment,
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
 * API: Get booking payment info (amounts, QR code, UPI intent link, Razorpay key)
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
 * API: Create Razorpay Order for online checkout
 */
router.post('/api/payments/razorpay/create-order', async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'Missing bookingId' });
    }

    const orderData = await createRazorpayOrder(bookingId);
    res.json({
      success: true,
      ...orderData
    });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * API: Verify Razorpay payment signature & settle
 */
router.post('/api/payments/razorpay/verify', async (req, res) => {
  try {
    const { orderId, paymentId, signature, bookingId } = req.body;

    if (!orderId || !paymentId || !signature || !bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required signature verification fields'
      });
    }

    const result = await verifyRazorpayPayment({
      orderId,
      paymentId,
      signature,
      bookingId
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('Razorpay verification error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * API: Confirm payment settlement (called on simulated instant payment)
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
