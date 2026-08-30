const express = require('express');
const router = express.Router();
const { processMessage, getConversationState, resetConversation } = require('../services/botEngine');

// Send message to WhatsApp AI bot simulator
router.post('/chat', async (req, res) => {
  try {
    const { conversationId = 'default', message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }

    const response = await processMessage(conversationId, message.trim());
    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Bot processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET conversation history & context
router.get('/state', (req, res) => {
  try {
    const { conversationId = 'default' } = req.query;
    const state = getConversationState(conversationId);
    res.json({ success: true, data: state });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset conversation
router.post('/reset', (req, res) => {
  try {
    const { conversationId = 'default' } = req.body;
    const result = resetConversation(conversationId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
