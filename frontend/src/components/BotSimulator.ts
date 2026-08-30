import { api } from '../api';
import type { BotResponse } from '../types';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export function renderBotSimulator(container: HTMLElement, showToast: (msg: string, type?: 'success' | 'error') => void) {
  let messages: ChatMessage[] = [
    {
      sender: 'bot',
      text: 'Welcome to Wayzyy Guest Concierge! 🏡✨\n\nI\'m your 24/7 AI booking assistant. How can I help you discover, check dates, or reserve a vacation stay today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ];

  let currentContext: any = {
    property: null,
    location: null,
    checkIn: null,
    checkOut: null,
    guests: null,
    status: 'inquiry'
  };

  let currentIntent = 'general';
  let suggestedActions: string[] = ['Check Casa Azul', 'Mountain Chalets', 'View Rates', 'Book Stay'];

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h1 class="section-title">WhatsApp AI Booking Concierge</h1>
        <p class="section-desc">Test the autonomous 24/7 guest concierge that qualifies guest leads, checks real-time dates, and closes direct reservations on WhatsApp.</p>
      </div>
      <button id="btn-reset-chat" class="btn btn-secondary btn-sm">🔄 Reset Conversation</button>
    </div>

    <div class="whatsapp-layout">
      <!-- Left: Mobile Phone Simulation -->
      <div class="phone-mockup">
        <!-- Phone Header -->
        <div class="phone-header">
          <div class="phone-avatar">🏡</div>
          <div class="phone-contact-info">
            <div class="phone-contact-name">
              <span>Wayzyy Guest Concierge</span>
              <span class="verified-icon">✓</span>
            </div>
            <div class="phone-contact-status">online • typically replies instantly</div>
          </div>
        </div>

        <!-- Chat Stream -->
        <div id="chat-messages-container" class="chat-messages">
          <!-- Messages will be rendered here -->
        </div>

        <!-- Quick Prompts Bar -->
        <div id="quick-prompts-container" class="quick-prompts-bar">
          <span class="prompt-chip" data-prompt="Is Casa Azul available next weekend for 4 guests?">🌴 Casa Azul Next Weekend</span>
          <span class="prompt-chip" data-prompt="Do you have mountain chalets in Manali with fireplace?">🏔️ Manali Mountain Chalet</span>
          <span class="prompt-chip" data-prompt="What are the rates for Haveli Heritage Stay?">🏛️ Rates for Jaipur Haveli</span>
          <span class="prompt-chip" data-prompt="I want to book the Skyline Penthouse in Mumbai for 2 nights">🏙️ Book Mumbai Penthouse</span>
        </div>

        <!-- Input Bar -->
        <div class="phone-input-bar">
          <input type="text" id="phone-chat-input" class="phone-input-field" placeholder="Type a message as a guest..." />
          <button id="phone-chat-send" class="phone-send-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
      </div>

      <!-- Right: AI Intent & Context Inspector -->
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div class="glass-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <div>
              <h3 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 800; color: #0f172a;">Live AI Entity & Intent Inspector</h3>
              <p style="font-size: 0.8rem; color: var(--text-muted);">Real-time semantic extraction from guest dialogue</p>
            </div>
            <span id="inspector-intent-tag" class="intent-tag">GENERAL</span>
          </div>

          <!-- Booking Progression Status -->
          <div style="margin-bottom: 1.5rem;">
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.5rem;">
              Booking Flow Stage
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem; text-align: center;">
              <div id="step-inquiry" class="step-pill" style="padding: 0.4rem; border-radius: var(--radius-sm); font-size: 0.72rem; font-weight: 700; background: #e0f2fe; color: #0284c7; border: 1px solid #7dd3fc;">1. Inquiry</div>
              <div id="step-checking" class="step-pill" style="padding: 0.4rem; border-radius: var(--radius-sm); font-size: 0.72rem; font-weight: 700; background: #f1ede4; color: var(--text-muted); border: 1px solid var(--border-subtle);">2. Checking</div>
              <div id="step-ready" class="step-pill" style="padding: 0.4rem; border-radius: var(--radius-sm); font-size: 0.72rem; font-weight: 700; background: #f1ede4; color: var(--text-muted); border: 1px solid var(--border-subtle);">3. Ready to Book</div>
              <div id="step-confirmed" class="step-pill" style="padding: 0.4rem; border-radius: var(--radius-sm); font-size: 0.72rem; font-weight: 700; background: #f1ede4; color: var(--text-muted); border: 1px solid var(--border-subtle);">4. Confirmed</div>
            </div>
          </div>

          <!-- Extracted Entities -->
          <div style="display: flex; flex-direction: column; gap: 0.2rem; background: #fbf9f5; padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div class="entity-row">
              <span class="entity-label">Target Property</span>
              <span id="entity-prop" class="entity-value">None</span>
            </div>
            <div class="entity-row">
              <span class="entity-label">Destination / Area</span>
              <span id="entity-loc" class="entity-value">None</span>
            </div>
            <div class="entity-row">
              <span class="entity-label">Check-In Date</span>
              <span id="entity-checkin" class="entity-value">Not specified</span>
            </div>
            <div class="entity-row">
              <span class="entity-label">Check-Out Date</span>
              <span id="entity-checkout" class="entity-value">Not specified</span>
            </div>
            <div class="entity-row" style="border-bottom: none;">
              <span class="entity-label">Guest Count</span>
              <span id="entity-guests" class="entity-value">Not specified</span>
            </div>
          </div>

          <!-- Dynamic Suggested Actions -->
          <div style="margin-top: 1.25rem;">
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.5rem;">
              Bot Suggested Reply Chips
            </div>
            <div id="dynamic-action-chips" style="display: flex; flex-wrap: wrap; gap: 0.45rem;">
              <!-- Dynamic chips -->
            </div>
          </div>
        </div>

        <!-- Host Concierge Capabilities -->
        <div class="glass-card">
          <h4 style="font-family: var(--font-heading); font-size: 1.05rem; font-weight: 800; color: #0f172a; margin-bottom: 0.6rem;">
            🤖 Concierge Automation Highlights
          </h4>
          <ul style="padding-left: 1.25rem; font-size: 0.88rem; color: var(--text-primary); display: flex; flex-direction: column; gap: 0.4rem;">
            <li><strong>Zero Platform Fees:</strong> Converts social & WhatsApp traffic directly into 0% commission direct bookings.</li>
            <li><strong>Instant Availability & Quotes:</strong> Understands natural inquiries like <em>"next weekend"</em> or <em>"3 nights in Manali"</em>.</li>
            <li><strong>Polite Hospitality Persona:</strong> Speaks warm, polite English and offers direct incentives for longer stays.</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  const chatContainer = container.querySelector('#chat-messages-container') as HTMLElement;
  const inputField = container.querySelector('#phone-chat-input') as HTMLInputElement;
  const sendBtn = container.querySelector('#phone-chat-send') as HTMLButtonElement;
  const resetBtn = container.querySelector('#btn-reset-chat') as HTMLButtonElement;

  function renderMessages() {
    chatContainer.innerHTML = messages.map(m => `
      <div class="message-bubble ${m.sender === 'user' ? 'bubble-user' : 'bubble-bot'}">
        <div>${m.text.replace(/\n/g, '<br/>')}</div>
        <div class="msg-time">${m.time}</div>
      </div>
    `).join('');

    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function updateInspector() {
    const intentTag = container.querySelector('#inspector-intent-tag') as HTMLElement;
    if (intentTag) {
      intentTag.innerText = currentIntent.toUpperCase();
      intentTag.className = `intent-tag intent-${currentIntent}`;
    }

    const propEl = container.querySelector('#entity-prop') as HTMLElement;
    const locEl = container.querySelector('#entity-loc') as HTMLElement;
    const checkinEl = container.querySelector('#entity-checkin') as HTMLElement;
    const checkoutEl = container.querySelector('#entity-checkout') as HTMLElement;
    const guestsEl = container.querySelector('#entity-guests') as HTMLElement;

    if (propEl) propEl.innerText = currentContext.property || 'None';
    if (locEl) locEl.innerText = currentContext.location || 'None';
    if (checkinEl) checkinEl.innerText = currentContext.checkIn || 'Not specified';
    if (checkoutEl) checkoutEl.innerText = currentContext.checkOut || 'Not specified';
    if (guestsEl) guestsEl.innerText = currentContext.guests ? `${currentContext.guests} guests` : 'Not specified';

    // Highlight active flow step
    const steps = ['inquiry', 'checking', 'ready', 'confirmed'];
    const activeStep = currentContext.status === 'ready_to_book' ? 'ready' : currentContext.status || 'inquiry';

    steps.forEach(s => {
      const el = container.querySelector(`#step-${s}`) as HTMLElement;
      if (el) {
        if (s === activeStep || (activeStep === 'confirmed' && s !== 'inquiry')) {
          el.style.background = '#e0f2fe';
          el.style.color = '#0284c7';
          el.style.borderColor = '#7dd3fc';
        } else {
          el.style.background = '#f1ede4';
          el.style.color = 'var(--text-muted)';
          el.style.borderColor = 'var(--border-subtle)';
        }
      }
    });

    // Render action chips
    const chipsContainer = container.querySelector('#dynamic-action-chips') as HTMLElement;
    if (chipsContainer) {
      chipsContainer.innerHTML = suggestedActions.map(action => `
        <span class="prompt-chip" data-prompt="${action}">⚡ ${action}</span>
      `).join('');

      chipsContainer.querySelectorAll('.prompt-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const prompt = chip.getAttribute('data-prompt');
          if (prompt) handleSendMessage(prompt);
        });
      });
    }
  }

  async function handleSendMessage(text: string) {
    if (!text.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messages.push({ sender: 'user', text, time });
    renderMessages();
    inputField.value = '';

    // Show typing placeholder
    const typingMsg: ChatMessage = {
      sender: 'bot',
      text: '✍️ Typing...',
      time
    };
    messages.push(typingMsg);
    renderMessages();

    try {
      const response: BotResponse = await api.sendBotMessage(text);
      // Remove typing placeholder
      messages.pop();

      messages.push({
        sender: 'bot',
        text: response.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      currentIntent = response.intent;
      currentContext = { ...currentContext, ...response.extractedData };
      suggestedActions = response.suggestedActions || ['View Stays', 'Check Rates', 'Book Stay'];

      renderMessages();
      updateInspector();
    } catch (err) {
      messages.pop();
      messages.push({
        sender: 'bot',
        text: 'Sorry, I had trouble processing that message. Please try asking again!',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      renderMessages();
    }
  }

  sendBtn?.addEventListener('click', () => handleSendMessage(inputField.value));
  inputField?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage(inputField.value);
  });

  container.querySelectorAll('#quick-prompts-container .prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt) handleSendMessage(prompt);
    });
  });

  resetBtn?.addEventListener('click', async () => {
    await api.resetBot();
    messages = [
      {
        sender: 'bot',
        text: 'Welcome to Wayzyy Guest Concierge! 🏡✨\n\nI\'m your 24/7 AI booking assistant. How can I help you discover, check dates, or reserve a vacation stay today?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    currentContext = { property: null, location: null, checkIn: null, checkOut: null, guests: null, status: 'inquiry' };
    currentIntent = 'general';
    suggestedActions = ['Check Casa Azul', 'Mountain Chalets', 'View Rates', 'Book Stay'];
    renderMessages();
    updateInspector();
    showToast('Conversation reset successfully.', 'success');
  });

  renderMessages();
  updateInspector();
}
