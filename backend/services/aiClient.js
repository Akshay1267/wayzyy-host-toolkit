const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

let geminiClient = null;
let anthropicClient = null;
let lastGeminiKey = null;
let lastAnthropicKey = null;

let connectionStatus = {
  tested: false,
  working: false,
  provider: 'fallback', // 'gemini' | 'claude' | 'fallback'
  error: null,
  lastChecked: null
};

function getActiveClients() {
  require('dotenv').config({ override: true });
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (geminiKey && geminiKey.trim() !== '' && !geminiKey.includes('your_gemini_api_key_here')) {
    if (!geminiClient || lastGeminiKey !== geminiKey) {
      try {
        geminiClient = new GoogleGenerativeAI(geminiKey.trim());
        lastGeminiKey = geminiKey;
      } catch (e) {
        console.warn('Could not init Gemini client:', e.message);
        geminiClient = null;
      }
    }
  } else {
    geminiClient = null;
  }

  if (anthropicKey && anthropicKey.trim() !== '' && !anthropicKey.includes('your_anthropic_api_key_here')) {
    if (!anthropicClient || lastAnthropicKey !== anthropicKey) {
      try {
        const options = { apiKey: anthropicKey.trim() };
        if (process.env.ANTHROPIC_WORKSPACE_ID) {
          options.defaultHeaders = { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID.trim() };
        }
        anthropicClient = new Anthropic(options);
        lastAnthropicKey = anthropicKey;
      } catch (e) {
        console.warn('Could not init Anthropic client:', e.message);
        anthropicClient = null;
      }
    }
  } else {
    anthropicClient = null;
  }

  return { geminiClient, anthropicClient };
}

async function testConnection(force = false) {
  require('dotenv').config({ override: true });
  const now = Date.now();
  if (!force && connectionStatus.tested && connectionStatus.lastChecked) {
    const elapsed = now - new Date(connectionStatus.lastChecked).getTime();
    if (elapsed < 30000) {
      return connectionStatus;
    }
  }

  const { geminiClient: gClient, anthropicClient: aClient } = getActiveClients();

  // Test Gemini first if key exists (Free Tier priority)
  if (gClient) {
    try {
      const model = gClient.getGenerativeModel({ model: 'gemini-3.6-flash' });
      const res = await model.generateContent('hi');
      if (res && res.response && res.response.text()) {
        connectionStatus = {
          tested: true,
          working: true,
          provider: 'gemini',
          model: 'gemini-3.6-flash (Free Tier)',
          error: null,
          lastChecked: new Date().toISOString()
        };
        console.log('✅ Google Gemini API verified and active');
        return connectionStatus;
      }
    } catch (err) {
      console.warn('⚠️ Gemini verification failed:', err.message);
      connectionStatus = {
        tested: true,
        working: false,
        provider: 'gemini',
        error: err.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  // Next try Claude if configured
  if (aClient) {
    try {
      const res = await aClient.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'hi' }]
      });
      if (res && res.content && res.content.length > 0) {
        connectionStatus = {
          tested: true,
          working: true,
          provider: 'claude',
          model: 'claude-3-5-sonnet',
          error: null,
          lastChecked: new Date().toISOString()
        };
        console.log('✅ Anthropic Claude API verified and active');
        return connectionStatus;
      }
    } catch (err) {
      console.warn('⚠️ Claude verification failed:', err.message);
      if (!connectionStatus.error) {
        connectionStatus.error = err.message;
      }
    }
  }

  // Fallback mode
  connectionStatus = {
    tested: true,
    working: false,
    provider: 'fallback',
    error: connectionStatus.error || 'No active AI key configured',
    lastChecked: new Date().toISOString()
  };
  return connectionStatus;
}

async function chat(systemPrompt, userMessage, options = {}) {
  const { geminiClient: gClient, anthropicClient: aClient } = getActiveClients();

  // Try Gemini
  if (gClient) {
    try {
      const model = gClient.getGenerativeModel({
        model: options.geminiModel || 'gemini-3.6-flash',
        systemInstruction: systemPrompt
      });
      const res = await model.generateContent(userMessage);
      if (res && res.response) {
        const text = res.response.text();
        if (text && text.trim()) {
          connectionStatus.working = true;
          connectionStatus.provider = 'gemini';
          return text.trim();
        }
      }
    } catch (err) {
      console.warn('Gemini chat error:', err.message);
    }
  }

  // Try Claude
  if (aClient) {
    try {
      const res = await aClient.messages.create({
        model: options.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens || 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      if (res && res.content && res.content[0]) {
        connectionStatus.working = true;
        connectionStatus.provider = 'claude';
        return res.content[0].text.trim();
      }
    } catch (err) {
      console.warn('Claude chat error:', err.message);
    }
  }

  return null;
}

async function chatWithHistory(systemPrompt, messages, options = {}) {
  const { geminiClient: gClient, anthropicClient: aClient } = getActiveClients();

  // Try Gemini
  if (gClient) {
    try {
      const model = gClient.getGenerativeModel({
        model: options.geminiModel || 'gemini-3.6-flash',
        systemInstruction: systemPrompt
      });

      const formattedHistory = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const chatSession = model.startChat({ history: formattedHistory });
      const lastMsg = messages[messages.length - 1];
      const res = await chatSession.sendMessage(lastMsg ? lastMsg.content : 'hello');
      if (res && res.response) {
        const text = res.response.text();
        if (text && text.trim()) {
          connectionStatus.working = true;
          connectionStatus.provider = 'gemini';
          return text.trim();
        }
      }
    } catch (err) {
      console.warn('Gemini chatWithHistory error:', err.message);
    }
  }

  // Try Claude
  if (aClient) {
    try {
      const res = await aClient.messages.create({
        model: options.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens || 1024,
        system: systemPrompt,
        messages,
      });
      if (res && res.content && res.content[0]) {
        connectionStatus.working = true;
        connectionStatus.provider = 'claude';
        return res.content[0].text.trim();
      }
    } catch (err) {
      console.warn('Claude chatWithHistory error:', err.message);
    }
  }

  return null;
}

module.exports = {
  testConnection,
  chat,
  chatWithHistory,
  getActiveClients
};
