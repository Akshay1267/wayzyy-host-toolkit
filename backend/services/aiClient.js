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
  model: null,
  error: null,
  lastChecked: null
};

// Candidate Gemini models to try in order of preference
const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-3.6-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro'
];

let workingGeminiModel = null;

function getActiveClients() {
  require('dotenv').config({ override: true });
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const anthropicKey = (process.env.ANTHROPIC_API_KEY || '').trim();

  const isGeminiValid = geminiKey !== '' && !geminiKey.includes('your_gemini_api_key_here');
  const isClaudeValid = anthropicKey !== '' && !anthropicKey.includes('your_anthropic_api_key_here');

  if (isGeminiValid) {
    if (!geminiClient || lastGeminiKey !== geminiKey) {
      try {
        geminiClient = new GoogleGenerativeAI(geminiKey);
        lastGeminiKey = geminiKey;
        // Reset tested state when key changes
        connectionStatus.tested = false;
      } catch (e) {
        console.warn('Could not init Gemini client:', e.message);
        geminiClient = null;
      }
    }
  } else {
    geminiClient = null;
    lastGeminiKey = null;
  }

  if (isClaudeValid) {
    if (!anthropicClient || lastAnthropicKey !== anthropicKey) {
      try {
        const options = { apiKey: anthropicKey };
        if (process.env.ANTHROPIC_WORKSPACE_ID) {
          options.defaultHeaders = { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID.trim() };
        }
        anthropicClient = new Anthropic(options);
        lastAnthropicKey = anthropicKey;
        connectionStatus.tested = false;
      } catch (e) {
        console.warn('Could not init Anthropic client:', e.message);
        anthropicClient = null;
      }
    }
  } else {
    anthropicClient = null;
    lastAnthropicKey = null;
  }

  return { geminiClient, anthropicClient };
}

/**
 * Tests connection.
 * Caches working state so background health polling doesn't burn user's API quota!
 */
async function testConnection(force = false) {
  require('dotenv').config({ override: true });
  const { geminiClient: gClient, anthropicClient: aClient } = getActiveClients();

  if (!gClient && !aClient) {
    connectionStatus = {
      tested: true,
      working: false,
      provider: 'fallback',
      model: null,
      error: 'No active AI key configured in .env',
      lastChecked: new Date().toISOString()
    };
    return connectionStatus;
  }

  // If already tested and working, return cached state without making costly generation calls
  if (!force && connectionStatus.tested && connectionStatus.working) {
    return connectionStatus;
  }

  // Test Gemini
  if (gClient) {
    const modelsToTry = workingGeminiModel ? [workingGeminiModel, ...GEMINI_MODELS.filter(m => m !== workingGeminiModel)] : GEMINI_MODELS;
    let lastErr = null;

    for (const modelName of modelsToTry) {
      try {
        const model = gClient.getGenerativeModel({ model: modelName });
        const res = await model.generateContent('hi');
        if (res && res.response && res.response.text()) {
          workingGeminiModel = modelName;
          connectionStatus = {
            tested: true,
            working: true,
            provider: 'gemini',
            model: `${modelName} (Free Tier)`,
            error: null,
            lastChecked: new Date().toISOString()
          };
          console.log(`✅ Gemini API verified & active using model: ${modelName}`);
          return connectionStatus;
        }
      } catch (err) {
        lastErr = err;
        // If 404, try next model in list. If 429 quota or auth error, save error
        if (err.message.includes('429')) {
          lastErr = err;
          break;
        }
      }
    }

    if (lastErr) {
      const isQuota = lastErr.message.includes('429') || lastErr.message.includes('quota');
      const friendlyErr = isQuota
        ? 'Gemini daily rate limit reached (20 req/day on preview key). Get a free standard key at https://aistudio.google.com/app/apikey (1,500 req/day)'
        : lastErr.message;

      connectionStatus = {
        tested: true,
        working: false,
        provider: 'gemini',
        model: workingGeminiModel || 'gemini',
        error: friendlyErr,
        lastChecked: new Date().toISOString()
      };
      console.warn('⚠️ Gemini verification failed:', friendlyErr);
    }
  }

  // Test Claude if Gemini not available
  if (aClient && !connectionStatus.working) {
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
        console.log('✅ Anthropic Claude API verified & active');
        return connectionStatus;
      }
    } catch (err) {
      console.warn('⚠️ Claude verification failed:', err.message);
      if (!connectionStatus.error) {
        connectionStatus.error = err.message;
      }
    }
  }

  return connectionStatus;
}

async function chat(systemPrompt, userMessage, options = {}) {
  const { geminiClient: gClient, anthropicClient: aClient } = getActiveClients();

  // Try Gemini
  if (gClient) {
    const modelsToTry = workingGeminiModel ? [workingGeminiModel, ...GEMINI_MODELS.filter(m => m !== workingGeminiModel)] : GEMINI_MODELS;
    for (const modelName of modelsToTry) {
      try {
        const model = gClient.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt
        });
        const res = await model.generateContent(userMessage);
        if (res && res.response) {
          const text = res.response.text();
          if (text && text.trim()) {
            workingGeminiModel = modelName;
            connectionStatus.working = true;
            connectionStatus.provider = 'gemini';
            return text.trim();
          }
        }
      } catch (err) {
        if (!err.message.includes('404')) {
          console.warn(`Gemini error (${modelName}):`, err.message.slice(0, 100));
          if (err.message.includes('429')) {
            connectionStatus.working = false;
            connectionStatus.error = 'Gemini free tier quota exhausted. Using smart fallback.';
            break;
          }
        }
      }
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
    const modelsToTry = workingGeminiModel ? [workingGeminiModel, ...GEMINI_MODELS.filter(m => m !== workingGeminiModel)] : GEMINI_MODELS;
    for (const modelName of modelsToTry) {
      try {
        const model = gClient.getGenerativeModel({
          model: modelName,
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
            workingGeminiModel = modelName;
            connectionStatus.working = true;
            connectionStatus.provider = 'gemini';
            return text.trim();
          }
        }
      } catch (err) {
        if (!err.message.includes('404')) {
          console.warn(`Gemini chatWithHistory error (${modelName}):`, err.message.slice(0, 100));
          if (err.message.includes('429')) {
            connectionStatus.working = false;
            break;
          }
        }
      }
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
