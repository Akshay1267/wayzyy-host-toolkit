const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { getDb } = require('./db/db');
const { testConnection } = require('./services/anthropicClient');
const propertiesRouter = require('./routes/properties');
const bookingsRouter = require('./routes/bookings');
const pricingRouter = require('./routes/pricing');
const listingRouter = require('./routes/listing');
const botRouter = require('./routes/bot');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize DB schema
try {
  getDb();
  console.log('📦 Database initialized');
} catch (e) {
  console.error('Database init warning:', e.message);
}

// Middleware
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check with active LLM verification
app.get('/api/health', async (req, res) => {
  const forceCheck = req.query.check === 'true';
  const llmStatus = await testConnection(forceCheck);

  res.json({
    status: 'ok',
    service: 'Wayzyy Host Toolkit API',
    time: new Date().toISOString(),
    llmConfigured: Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== ''),
    llmWorking: llmStatus.working,
    llmError: llmStatus.error
  });
});

// Mount routes
app.use('/api/properties', propertiesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/listing', listingRouter);
app.use('/api/bot', botRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Wayzyy Host Toolkit API running at http://localhost:${PORT}`);
  // Perform background startup test of Claude API
  testConnection(true).then(status => {
    if (status.working) {
      console.log('✨ Claude AI API connection verified successfully');
    } else if (process.env.ANTHROPIC_API_KEY) {
      console.log(`⚠️ Claude AI API key provided but test failed: ${status.error}`);
    } else {
      console.log('ℹ️ Running in Smart Fallback AI mode (No Anthropic API key configured)');
    }
  });
});
