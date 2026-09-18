/**
 * WhatsApp Cloud API Client
 * Handles sending messages via the Meta WhatsApp Business Cloud API.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const WHATSAPP_API_VERSION = 'v21.0';
const WHATSAPP_API_BASE = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

function getConfig() {
  const accessToken = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  return { accessToken, phoneNumberId };
}

function isConfigured() {
  const { accessToken, phoneNumberId } = getConfig();
  return Boolean(accessToken && phoneNumberId);
}

/**
 * Send a plain text message to a WhatsApp number.
 * @param {string} to - Recipient phone number in international format (e.g., '919812345678')
 * @param {string} text - The message body
 */
async function sendTextMessage(to, text) {
  const { accessToken, phoneNumberId } = getConfig();
  if (!accessToken || !phoneNumberId) {
    throw new Error('WhatsApp Cloud API is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env');
  }

  const url = `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.error?.message || JSON.stringify(data);
    console.error(`❌ WhatsApp send failed [${response.status}]:`, errorMsg);
    throw new Error(`WhatsApp API error: ${errorMsg}`);
  }

  console.log(`✅ WhatsApp message sent to ${to} (msg_id: ${data.messages?.[0]?.id || 'unknown'})`);
  return data;
}

/**
 * Send interactive reply buttons to guide the guest through booking flow.
 * Limited to 3 buttons max by WhatsApp API.
 * @param {string} to - Recipient phone number
 * @param {string} bodyText - Message body above the buttons
 * @param {Array<{id: string, title: string}>} buttons - Up to 3 buttons
 */
async function sendInteractiveButtons(to, bodyText, buttons = []) {
  const { accessToken, phoneNumberId } = getConfig();
  if (!accessToken || !phoneNumberId) {
    throw new Error('WhatsApp Cloud API not configured.');
  }

  // WhatsApp limits to 3 buttons; button titles max 20 chars
  const sanitizedButtons = buttons.slice(0, 3).map((btn, i) => ({
    type: 'reply',
    reply: {
      id: btn.id || `btn_${i}`,
      title: (btn.title || '').substring(0, 20)
    }
  }));

  if (sanitizedButtons.length === 0) {
    // Fallback to plain text if no valid buttons
    return sendTextMessage(to, bodyText);
  }

  const url = `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: { buttons: sanitizedButtons }
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.error?.message || JSON.stringify(data);
    console.error(`❌ WhatsApp interactive send failed:`, errorMsg);
    // Fallback to plain text on interactive failure
    console.log('⚠️ Falling back to plain text message...');
    return sendTextMessage(to, bodyText);
  }

  console.log(`✅ WhatsApp interactive message sent to ${to}`);
  return data;
}

/**
 * Mark an incoming message as read (blue double-tick).
 * @param {string} messageId - The wamid of the incoming message
 */
async function markAsRead(messageId) {
  const { accessToken, phoneNumberId } = getConfig();
  if (!accessToken || !phoneNumberId) return;

  try {
    const url = `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      })
    });
  } catch (err) {
    // Non-critical — don't throw
    console.warn('⚠️ Failed to mark message as read:', err.message);
  }
}

/**
 * Verify the WhatsApp Cloud API access token by calling the phone number endpoint.
 */
async function verifyToken() {
  const { accessToken, phoneNumberId } = getConfig();
  if (!accessToken || !phoneNumberId) {
    return { configured: false, working: false, error: 'Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID' };
  }

  try {
    const url = `${WHATSAPP_API_BASE}/${phoneNumberId}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await response.json();

    if (response.ok && data.id) {
      return {
        configured: true,
        working: true,
        phoneNumber: data.display_phone_number || null,
        qualityRating: data.quality_rating || null,
        name: data.verified_name || null
      };
    } else {
      return {
        configured: true,
        working: false,
        error: data?.error?.message || 'Token verification failed'
      };
    }
  } catch (err) {
    return { configured: true, working: false, error: err.message };
  }
}

module.exports = {
  isConfigured,
  sendTextMessage,
  sendInteractiveButtons,
  markAsRead,
  verifyToken
};
