/**
 * WhatsApp Cloud API Webhook Routes
 * 
 * GET  /api/whatsapp/webhook — Meta webhook verification (challenge-response)
 * POST /api/whatsapp/webhook — Incoming message handler
 */

const express = require('express');
const router = express.Router();
const { processMessage } = require('../services/botEngine');
const { sendTextMessage, sendInteractiveButtons, markAsRead, isConfigured } = require('../services/whatsappClient');

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
 * Processes them through the AI concierge and sends replies.
 */
router.post('/webhook', async (req, res) => {
  // Immediately acknowledge receipt — Meta expects 200 within 20s
  res.status(200).json({ status: 'received' });

  try {
    const body = req.body;

    // Validate this is a WhatsApp message notification
    if (body?.object !== 'whatsapp_business_account') return;

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

          // Extract message text
          let messageText = '';
          if (message.type === 'text') {
            messageText = message.text?.body || '';
          } else if (message.type === 'interactive') {
            // Handle button reply clicks
            messageText = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '';
          }

          if (!messageText.trim()) continue;

          console.log(`📩 WhatsApp message from ${senderName} (${senderPhone}): "${messageText}"`);

          // Mark message as read (blue ticks)
          markAsRead(messageId);

          try {
            // Process through AI concierge — use phone number as conversation ID
            const aiResponse = await processMessage(senderPhone, messageText.trim());

            // Send AI reply text
            await sendTextMessage(senderPhone, aiResponse.reply);

            // Send suggested actions as interactive buttons (max 3)
            const actions = (aiResponse.suggestedActions || []).slice(0, 3);
            if (actions.length > 0) {
              const buttons = actions.map((action, i) => ({
                id: `action_${i}_${Date.now()}`,
                title: action
              }));

              // Small delay to ensure messages arrive in order
              await new Promise(resolve => setTimeout(resolve, 500));
              await sendInteractiveButtons(senderPhone, '💡 Quick actions:', buttons);
            }

            console.log(`✅ Replied to ${senderName} (${senderPhone}) — Intent: ${aiResponse.intent}, Status: ${aiResponse.bookingStatus}`);
          } catch (msgErr) {
            console.error(`⚠️ Failed to process/reply to ${senderName} (${senderPhone}):`, msgErr.message);
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
 * Returns the current WhatsApp integration status.
 */
router.get('/status', async (req, res) => {
  const { verifyToken } = require('../services/whatsappClient');
  const status = await verifyToken();
  res.json({ success: true, data: status });
});

module.exports = router;
