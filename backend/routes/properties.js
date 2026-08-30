const express = require('express');
const router = express.Router();
const { getDb } = require('../db/db');

// GET all properties with summary stats
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const properties = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM bookings b WHERE b.property_id = p.id AND b.status IN ('confirmed', 'completed')) as total_bookings,
        (SELECT COALESCE(SUM(b.total_amount), 0) FROM bookings b WHERE b.property_id = p.id AND b.status IN ('confirmed', 'completed')) as total_revenue
      FROM properties p
      ORDER BY p.id ASC
    `).all();

    const formatted = properties.map(p => ({
      ...p,
      amenities: JSON.parse(p.amenities || '[]'),
      image_urls: JSON.parse(p.image_urls || '[]'),
      total_bookings: p.total_bookings || 0,
      total_revenue: p.total_revenue || 0
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single property
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    const bookings = db.prepare('SELECT * FROM bookings WHERE property_id = ? ORDER BY check_in DESC').all(req.params.id);
    const pricingLogs = db.prepare('SELECT * FROM pricing_logs WHERE property_id = ? ORDER BY created_at DESC LIMIT 5').all(req.params.id);

    res.json({
      success: true,
      data: {
        ...property,
        amenities: JSON.parse(property.amenities || '[]'),
        image_urls: JSON.parse(property.image_urls || '[]'),
        bookings,
        pricingLogs: pricingLogs.map(l => ({
          ...l,
          factors: JSON.parse(l.factors || '[]')
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST new property
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const {
      name,
      property_type = 'villa',
      location,
      location_tier = 'mid',
      bedrooms = 1,
      bathrooms = 1,
      max_guests = 2,
      base_rate,
      amenities = [],
      description = '',
      image_urls = [],
      listing_score = 8.0
    } = req.body;

    if (!name || !location || !base_rate) {
      return res.status(400).json({ success: false, error: 'Name, location, and base_rate are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO properties (host_id, name, property_type, location, location_tier, bedrooms, bathrooms, max_guests, base_rate, amenities, description, image_urls, listing_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      1,
      name,
      property_type,
      location,
      location_tier,
      Number(bedrooms),
      Number(bathrooms),
      Number(max_guests),
      Number(base_rate),
      JSON.stringify(amenities),
      description,
      JSON.stringify(image_urls),
      Number(listing_score)
    );

    res.status(201).json({
      success: true,
      data: { id: result.lastInsertRowid, message: 'Property created successfully' }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update property
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const {
      name,
      property_type,
      location,
      location_tier,
      bedrooms,
      bathrooms,
      max_guests,
      base_rate,
      amenities,
      description,
      image_urls,
      listing_score
    } = req.body;

    const existing = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    const stmt = db.prepare(`
      UPDATE properties SET
        name = COALESCE(?, name),
        property_type = COALESCE(?, property_type),
        location = COALESCE(?, location),
        location_tier = COALESCE(?, location_tier),
        bedrooms = COALESCE(?, bedrooms),
        bathrooms = COALESCE(?, bathrooms),
        max_guests = COALESCE(?, max_guests),
        base_rate = COALESCE(?, base_rate),
        amenities = COALESCE(?, amenities),
        description = COALESCE(?, description),
        image_urls = COALESCE(?, image_urls),
        listing_score = COALESCE(?, listing_score)
      WHERE id = ?
    `);

    stmt.run(
      name,
      property_type,
      location,
      location_tier,
      bedrooms !== undefined ? Number(bedrooms) : null,
      bathrooms !== undefined ? Number(bathrooms) : null,
      max_guests !== undefined ? Number(max_guests) : null,
      base_rate !== undefined ? Number(base_rate) : null,
      amenities ? JSON.stringify(amenities) : null,
      description,
      image_urls ? JSON.stringify(image_urls) : null,
      listing_score !== undefined ? Number(listing_score) : null,
      req.params.id
    );

    res.json({ success: true, message: 'Property updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE property
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM bookings WHERE property_id = ?').run(req.params.id);
    db.prepare('DELETE FROM pricing_logs WHERE property_id = ?').run(req.params.id);
    db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
