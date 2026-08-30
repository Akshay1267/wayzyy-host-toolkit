const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

let client = null;
let lastApiKey = null;
let lastWorkspaceId = null;

let connectionStatus = {
  tested: false,
  working: false,
  error: null,
  lastChecked: null
};

function getClient() {
  require('dotenv').config({ override: true });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;

  if (!apiKey) {
    client = null;
    return null;
  }

  // Re-create client if credentials changed
  if (!client || lastApiKey !== apiKey || lastWorkspaceId !== workspaceId) {
    try {
      const options = { apiKey };
      if (workspaceId) {
        options.defaultHeaders = {
          'anthropic-workspace-id': workspaceId
        };
      }
      client = new Anthropic(options);
      lastApiKey = apiKey;
      lastWorkspaceId = workspaceId;
    } catch (e) {
      console.warn('⚠️ Could not initialize Anthropic client:', e.message);
      client = null;
      return null;
    }
  }

  return client;
}

async function testConnection(force = false) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_anthropic_api_key_here')) {
    connectionStatus = {
      tested: true,
      working: false,
      error: 'No Anthropic API key configured',
      lastChecked: new Date().toISOString()
    };
    return connectionStatus;
  }

  // Cache test for 30 seconds unless forced
  const now = Date.now();
  if (!force && connectionStatus.tested && connectionStatus.lastChecked) {
    const elapsed = now - new Date(connectionStatus.lastChecked).getTime();
    if (elapsed < 30000) {
      return connectionStatus;
    }
  }

  const anthropic = getClient();
  if (!anthropic) {
    connectionStatus = {
      tested: true,
      working: false,
      error: 'Failed to initialize Anthropic SDK client',
      lastChecked: new Date().toISOString()
    };
    return connectionStatus;
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'hi' }]
    });

    if (response && response.content && response.content.length > 0) {
      connectionStatus = {
        tested: true,
        working: true,
        error: null,
        lastChecked: new Date().toISOString()
      };
      console.log('✅ Anthropic Claude API verified and functional');
    } else {
      connectionStatus = {
        tested: true,
        working: false,
        error: 'Empty response from Anthropic API',
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('⚠️ Anthropic Claude verification error:', error.message);
    connectionStatus = {
      tested: true,
      working: false,
      error: error.message || 'API request failed',
      lastChecked: new Date().toISOString()
    };
  }

  return connectionStatus;
}

async function chat(systemPrompt, userMessage, options = {}) {
  const anthropic = getClient();
  if (!anthropic) return null;

  try {
    const response = await anthropic.messages.create({
      model: options.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens || 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    if (response && response.content && response.content[0]) {
      connectionStatus.working = true;
      connectionStatus.error = null;
      return response.content[0].text;
    }
    return null;
  } catch (error) {
    console.error('Anthropic API error:', error.message);
    connectionStatus.working = false;
    connectionStatus.error = error.message;
    return null;
  }
}

async function chatWithHistory(systemPrompt, messages, options = {}) {
  const anthropic = getClient();
  if (!anthropic) return null;

  try {
    const response = await anthropic.messages.create({
      model: options.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens || 1024,
      system: systemPrompt,
      messages,
    });
    if (response && response.content && response.content[0]) {
      connectionStatus.working = true;
      connectionStatus.error = null;
      return response.content[0].text;
    }
    return null;
  } catch (error) {
    console.error('Anthropic API error:', error.message);
    connectionStatus.working = false;
    connectionStatus.error = error.message;
    return null;
  }
}

module.exports = { getClient, testConnection, chat, chatWithHistory };
