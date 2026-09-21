/**
 * WhatsApp Cloud API Webhook Routes
 * 
 * GET  /api/whatsapp/webhook — Meta webhook verification (challenge-response)
 * POST /api/whatsapp/webhook — Incoming message handler with booking flow
 * GET  /api/whatsapp/status  — WhatsApp integration status
 */

const express = require('express');
const router = express.Router();
const { processMessage } = require('../services/botEngine');
const { sendTextMessage, sendInteractiveButtons, markAsRead, isConfigured } = require('../services/whatsappClient');
const { getPublicUrl } = require('../services/paymentService');

// Default verify token — override via WHATSAPP_VERIFY_TOKEN in .env
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'wayzyy_webhook_verify_2026';

/**
 * GET /api/whatsapp/webhook
 * Meta sends this during webhook setup to verify ownership.
 * Must respond with the hub.challenge value.
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified successfully');
    return res.status(200).send(challenge);
  }

  console.warn('⚠️ WhatsApp webhook verification failed — token mismatch');
  return res.status(403).json({ error: 'Verification failed' });
});

/**
 * POST /api/whatsapp/webhook
 * Receives incoming messages from WhatsApp Cloud API.
 * Processes them through the AI concierge, handles bookings, and sends replies.
 */
router.post('/webhook', async (req, res) => {
  // Immediately acknowledge receipt — Meta expects 200 within 20s
  res.status(200).json({ status: 'received' });

  try {
    const body = req.body;
    console.log('📩 WhatsApp Webhook POST received:', JSON.stringify(body, null, 2));

    // Validate this is a WhatsApp message notification
    if (body?.object !== 'whatsapp_business_account') {
      console.log('ℹ️ Webhook ignored: body.object is', body?.object);
      return;
    }

    // Check WhatsApp configuration
    if (!isConfigured()) {
      console.warn('⚠️ WhatsApp webhook received but WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured in .env');
      return;
    }

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value || {};
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const message of messages) {
          // Skip non-text messages for now (images, audio, etc.)
          if (message.type !== 'text' && message.type !== 'interactive') continue;

          const senderPhone = message.from; // e.g. '919812345678'
          const messageId = message.id;
          const senderName = contacts.find(c => c.wa_id === senderPhone)?.profile?.name || 'Guest';

          // Extract message text and button ID
          let messageText = '';
          let buttonId = '';
          if (message.type === 'text') {
            messageText = message.text?.body || '';
          } else if (message.type === 'interactive') {
            buttonId = message.interactive?.button_reply?.id || '';
            messageText = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '';
          }

          if (!messageText.trim() && !buttonId) continue;

          console.log(`📩 WhatsApp message from ${senderName} (${senderPhone}): "${messageText}" (buttonId: ${buttonId || 'none'})`);

          // Mark message as read (blue ticks)
          markAsRead(messageId);

          // Handle direct payment button click
          if (buttonId.startsWith('pay_') || messageText.includes('Pay Online')) {
            const bId = buttonId.replace('pay_', '').trim();
            const payUrl = `${getPublicUrl()}/pay/${bId}`;
            await sendTextMessage(
              senderPhone,
              `💳 *SECURE PAYMENT LINK*\n\nTo complete your reservation, tap the link below to pay via *Google Pay, PhonePe, Paytm, UPI QR, or Card*:\n\n👉 ${payUrl}\n\nYour check-in voucher will be issued immediately upon payment confirmation! 🙏`
            );
            continue;
          }

          try {
            // Process through AI concierge — use phone number as conversation ID
            const aiResponse = await processMessage(senderPhone, messageText.trim());

            // ── Send booking confirmation receipt ──
            if (aiResponse.bookingResult) {
              const booking = aiResponse.bookingResult;
              console.log(`🎉 WhatsApp booking created! #${booking.id} — ${booking.propertyName} for ${senderName} (${senderPhone})`);

              // Send the confirmation message (already formatted by bot engine)
              await sendTextMessage(senderPhone, aiResponse.reply);

              // Send post-booking action buttons (including Pay Online!)
              await new Promise(resolve => setTimeout(resolve, 800));
              const postBookingButtons = [
                { id: `pay_${booking.id}`, title: '💳 Pay Online' },
                { id: `details_${booking.id}`, title: '📋 Booking Details' },
                { id: `contact_host_${booking.id}`, title: '📞 Contact Host' }
              ];
              await sendInteractiveButtons(
                senderPhone,
                `Your stay at ${booking.propertyName} is reserved! Tap below to view your voucher & pay online:`,
                postBookingButtons
              );

            } else {
              // ── Regular reply ──
              await sendTextMessage(senderPhone, aiResponse.reply);

              // Send suggested actions as interactive buttons (max 3)
              const actions = (aiResponse.suggestedActions || []).slice(0, 3);
              if (actions.length > 0) {
                const buttons = actions.map((action, i) => ({
                  id: `action_${i}_${Date.now()}`,
                  title: action.substring(0, 20) // WhatsApp 20-char limit
                }));

                // Small delay to ensure messages arrive in order
                await new Promise(resolve => setTimeout(resolve, 500));

                try {
                  await sendInteractiveButtons(senderPhone, '💡 Quick actions:', buttons);
                } catch (btnErr) {
                  // Interactive buttons can fail for various reasons; don't block the flow
                  console.warn(`⚠️ Could not send interactive buttons to ${senderPhone}:`, btnErr.message);
                }
              }
            }

            console.log(`✅ Replied to ${senderName} (${senderPhone}) — Intent: ${aiResponse.intent}, Status: ${aiResponse.bookingStatus}`);
          } catch (msgErr) {
            console.error(`⚠️ Failed to process/reply to ${senderName} (${senderPhone}):`, msgErr.message);

            // Detect token expiry and log clearly
            if (msgErr.message && (msgErr.message.includes('expired') || msgErr.message.includes('OAuthException') || msgErr.message.includes('access token'))) {
              console.error('🔑❌ WhatsApp Access Token has EXPIRED! Generate a new one from Meta Developer Dashboard → WhatsApp → API Setup');
            }

            // Try to send an error message to the guest
            try {
              await sendTextMessage(senderPhone, 'Sorry, I encountered a temporary issue. Please try again in a moment! 🙏');
            } catch (retryErr) {
              // If even this fails, the token is likely expired
              if (retryErr.message && (retryErr.message.includes('expired') || retryErr.message.includes('OAuthException'))) {
                console.error('🔑❌ WhatsApp Access Token has EXPIRED! Cannot send any messages. Refresh token in Meta Developer Dashboard.');
              }
              console.error('❌ Could not send error message to guest:', retryErr.message);
            }
          }
        }
      }
    }
  } catch (err) {
    // Don't throw — we already sent 200 to Meta
    console.error('❌ WhatsApp webhook processing error:', err);
  }
});

/**
 * GET /api/whatsapp/status
 * Returns the current WhatsApp integration status with token health info.
 */
router.get('/status', async (req, res) => {
  const { verifyToken } = require('../services/whatsappClient');
  const status = await verifyToken();

  // Add helpful error context for common issues
  if (status.error && status.error.includes('expired')) {
    status.tokenExpired = true;
    status.fix = 'Generate a new access token from Meta Developer Dashboard → Your App → WhatsApp → API Setup';
  }

  res.json({ success: true, data: status });
});

module.exports = router;
