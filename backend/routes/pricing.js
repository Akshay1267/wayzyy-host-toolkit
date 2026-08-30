const express = require('express');
const router = express.Router();
const { suggestPrice, generateExplanation, findComparables, compsData } = require('../services/pricingEngine');
const { getDb } = require('../db/db');

// Calculate dynamic pricing
router.post('/calculate', async (req, res) => {
  try {
    const {
      propertyId,
      baseRate,
      propertyType = 'villa',
      location = 'Anjuna',
      bedrooms = 2,
      amenities = [],
      checkIn = null
    } = req.body;

    let finalBaseRate = Number(baseRate);

    // If propertyId is provided and baseRate not specified, fetch property from DB
    if (propertyId && !finalBaseRate) {
      const db = getDb();
      const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);
      if (prop) {
        finalBaseRate = prop.base_rate;
      }
    }

    if (!finalBaseRate) {
      finalBaseRate = 3500;
    }

    const priceResult = suggestPrice({
      baseRate: finalBaseRate,
      propertyType,
      location,
      bedrooms: Number(bedrooms),
      amenities,
      checkIn
    });

    const explanation = await generateExplanation(priceResult, {
      propertyType,
      location,
      bedrooms: Number(bedrooms),
      amenities
    });

    res.json({
      success: true,
      data: {
        ...priceResult,
        explanation
      }
    });
  } catch (error) {
    console.error('Pricing calculation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save pricing recommendation to database
router.post('/save-log', (req, res) => {
  try {
    const db = getDb();
    const {
      property_id,
      suggested_low,
      suggested_mid,
      suggested_high,
      factors = [],
      explanation = '',
      date_range_start = null,
      date_range_end = null
    } = req.body;

    if (!property_id) {
      return res.status(400).json({ success: false, error: 'property_id is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO pricing_logs (property_id, suggested_low, suggested_mid, suggested_high, factors, explanation, date_range_start, date_range_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      property_id,
      suggested_low,
      suggested_mid,
      suggested_high,
      JSON.stringify(factors),
      explanation,
      date_range_start,
      date_range_end
    );

    res.status(201).json({
      success: true,
      data: { id: result.lastInsertRowid, message: 'Pricing recommendation logged' }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET market comparables
router.get('/comps', (req, res) => {
  try {
    const { type, location } = req.query;
    if (type || location) {
      const filtered = findComparables(type, location);
      return res.json({ success: true, data: filtered });
    }
    res.json({ success: true, data: compsData.comparables || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET pricing history for a property
router.get('/logs/:propertyId', (req, res) => {
  try {
    const db = getDb();
    const logs = db.prepare(`
      SELECT * FROM pricing_logs
      WHERE property_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(req.params.propertyId);

    const formatted = logs.map(l => ({
      ...l,
      factors: JSON.parse(l.factors || '[]')
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
