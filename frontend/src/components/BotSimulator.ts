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
      text: 'Namaste & Welcome to Wayzyy Goa! 🌴✨\n\nI\'m your 24/7 AI booking assistant for local host Rajesh. How can I help you plan your Goan stay today?',
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
  let suggestedActions: string[] = ['Check Casa Azul', 'View Rates', 'Book Stay'];

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h1 class="section-title">WhatsApp AI Booking Assistant</h1>
        <p class="section-desc">Test the autonomous 24/7 guest concierge that qualifies guest leads, checks real-time dates, and closes direct reservations on WhatsApp.</p>
      </div>
      <button id="btn-reset-chat" class="btn btn-secondary btn-sm">🔄 Reset Conversation</button>
    </div>

    <div class="whatsapp-layout">
      <!-- Left: Mobile Phone Simulation -->
      <div class="phone-mockup">
        <!-- Phone Header -->
        <div class="phone-header">
          <div class="phone-avatar">🌴</div>
          <div class="phone-contact-info">
            <div class="phone-contact-name">
              <span>Wayzyy Host Concierge</span>
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
          <span class="prompt-chip" data-prompt="Is Casa Azul available next weekend for 4 guests?">🏡 Casa Azul Next Weekend</span>
          <span class="prompt-chip" data-prompt="What are the rates for Pinto's Heritage Stay?">💰 Rates for Pinto's</span>
          <span class="prompt-chip" data-prompt="I want to book Sunset Shack for 2 nights">🏖️ Book Sunset Shack</span>
          <span class="prompt-chip" data-prompt="Do you have any beachfront stays with WiFi?">🌊 Beachfront + WiFi</span>
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
              <h3 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700;">Live AI Entity & Intent Inspector</h3>
              <p style="font-size: 0.8rem; color: var(--text-muted);">Real-time semantic extraction from guest dialogue</p>
            </div>
            <span id="inspector-intent-tag" class="intent-tag">GENERAL</span>
          </div>

          <!-- Booking Progression Status -->
          <div style="margin-bottom: 1.5rem;">
            <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem;">
              Booking Flow Stage
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem; text-align: center;">
              <div id="step-inquiry" class="step-pill" style="padding: 0.4rem; border-radius: var(--radius-sm); font-size: 0.72rem; font-weight: 700; background: rgba(14, 165, 233, 0.2); color: #38bdf8; border: 1px solid #0ea5e9;">1. Inquiry</div>
              <div id="step-checking" class="step-pill" style="padding: 0.4rem; border-radius: var(--radius-sm); font-size: 0.72rem; font-weight: 700; background: rgba(255,255,255,0.04); color: var(--text-muted);">2. Checking</div>
              <div id="step-ready" class="step-pill" style="padding: 0.4rem; border-radius: var(--radius-sm); font-size: 0.72rem; font-weight: 700; background: rgba(255,255,255,0.04); color: var(--text-muted);">3. Ready to Book</div>
              <div id="step-confirmed" class="step-pill" style="padding: 0.4rem; border-radius: var(--radius-sm); font-size: 0.72rem; font-weight: 700; background: rgba(255,255,255,0.04); color: var(--text-muted);">4. Confirmed</div>
            </div>
          </div>

          <!-- Extracted Entities -->
          <div style="display: flex; flex-direction: column; gap: 0.2rem; background: rgba(0, 0, 0, 0.25); padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div class="entity-row">
              <span class="entity-label">Target Property</span>
              <span id="entity-prop" class="entity-value">None</span>
            </div>
            <div class="entity-row">
              <span class="entity-label">Micro-Location</span>
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
            <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem;">
              Bot Suggested Reply Chips
            </div>
            <div id="dynamic-action-chips" style="display: flex; flex-wrap: wrap; gap: 0.45rem;">
              <!-- Dynamic chips -->
            </div>
          </div>
        </div>

        <!-- Host Concierge Capabilities -->
        <div class="glass-card">
          <h4 style="font-family: var(--font-heading); font-size: 1rem; font-weight: 700; margin-bottom: 0.6rem;">
            🤖 Concierge Automation Highlights
          </h4>
          <ul style="padding-left: 1.25rem; font-size: 0.85rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.4rem;">
            <li><strong>Zero Platform Fees:</strong> Converts social & WhatsApp traffic directly to host reservations.</li>
            <li><strong>Instant Availability Match:</strong> Understands natural inquiries like <em>"next weekend"</em> or <em>"3 nights in Anjuna"</em>.</li>
            <li><strong>Polite Goan Host Persona:</strong> Speaks friendly Indian English and presents direct discounts for longer stays.</li>
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

  function updateInspector(intent: string, context: any, actions: string[]) {
    const intentTag = container.querySelector('#inspector-intent-tag') as HTMLElement;
    if (intentTag) intentTag.textContent = intent.toUpperCase();

    const entityProp = container.querySelector('#entity-prop') as HTMLElement;
    if (entityProp) entityProp.textContent = context.property || 'None';

    const entityLoc = container.querySelector('#entity-loc') as HTMLElement;
    if (entityLoc) entityLoc.textContent = context.location || 'None';

    const entityCheckin = container.querySelector('#entity-checkin') as HTMLElement;
    if (entityCheckin) entityCheckin.textContent = context.checkIn || 'Not specified';

    const entityCheckout = container.querySelector('#entity-checkout') as HTMLElement;
    if (entityCheckout) entityCheckout.textContent = context.checkOut || 'Not specified';

    const entityGuests = container.querySelector('#entity-guests') as HTMLElement;
    if (entityGuests) entityGuests.textContent = context.guests ? `${context.guests} Guests` : 'Not specified';

    // Update progression stage
    const steps = ['inquiry', 'checking', 'ready', 'confirmed'];
    const currentStage = context.status === 'ready_to_book' ? 'ready' : (context.status || 'inquiry');

    steps.forEach(st => {
      const el = container.querySelector(`#step-${st}`) as HTMLElement;
      if (el) {
        if (st === currentStage) {
          el.style.background = 'rgba(16, 185, 129, 0.2)';
          el.style.color = '#34d399';
          el.style.border = '1px solid #10b981';
        } else {
          el.style.background = 'rgba(255,255,255,0.04)';
          el.style.color = 'var(--text-muted)';
          el.style.border = 'none';
        }
      }
    });

    // Update dynamic chips
    const chipsContainer = container.querySelector('#dynamic-action-chips') as HTMLElement;
    if (chipsContainer) {
      chipsContainer.innerHTML = actions.map(act => `
        <button class="btn btn-secondary btn-sm bot-chip-btn" data-text="${act}" style="font-size: 0.75rem; padding: 0.3rem 0.65rem;">
          ${act}
        </button>
      `).join('');

      chipsContainer.querySelectorAll('.bot-chip-btn').forEach(b => {
        b.addEventListener('click', () => {
          const prompt = (b as HTMLElement).dataset.text || '';
          inputField.value = prompt;
          handleSend();
        });
      });
    }
  }

  async function handleSend() {
    const text = inputField.value.trim();
    if (!text) return;

    inputField.value = '';
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messages.push({
      sender: 'user',
      text,
      time: nowTime
    });
    renderMessages();

    // Show typing animation
    const typingBubble = document.createElement('div');
    typingBubble.className = 'message-bubble bubble-bot';
    typingBubble.id = 'typing-bubble';
    typingBubble.innerHTML = `
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    chatContainer.appendChild(typingBubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
      const response: BotResponse = await api.sendBotMessage(text);
      typingBubble.remove();

      messages.push({
        sender: 'bot',
        text: response.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      renderMessages();

      currentIntent = response.intent;
      currentContext = response.extractedData || currentContext;
      suggestedActions = response.suggestedActions || [];

      updateInspector(currentIntent, currentContext, suggestedActions);
    } catch (err) {
      typingBubble.remove();
      messages.push({
        sender: 'bot',
        text: 'Sorry, I had a brief network glitch! Could you say that again?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      renderMessages();
      showToast('Bot error: ' + (err as Error).message, 'error');
    }
  }

  sendBtn?.addEventListener('click', handleSend);
  inputField?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  });

  // Quick prompt chips
  container.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      inputField.value = (chip as HTMLElement).dataset.prompt || '';
      handleSend();
    });
  });

  resetBtn?.addEventListener('click', async () => {
    await api.resetBot();
    messages = [
      {
        sender: 'bot',
        text: 'Namaste & Welcome to Wayzyy Goa! 🌴✨\n\nI\'m your 24/7 AI booking assistant for local host Rajesh. How can I help you plan your Goan stay today?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    currentContext = { property: null, location: null, checkIn: null, checkOut: null, guests: null, status: 'inquiry' };
    currentIntent = 'general';
    suggestedActions = ['Check Casa Azul', 'View Rates', 'Book Stay'];

    renderMessages();
    updateInspector(currentIntent, currentContext, suggestedActions);
    showToast('Conversation reset', 'success');
  });

  // Initial render
  renderMessages();
  updateInspector(currentIntent, currentContext, suggestedActions);
}
