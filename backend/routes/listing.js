const express = require('express');
const router = express.Router();
const { generateListing, assessImageQuality } = require('../services/listingGenerator');
const { getDb } = require('../db/db');

// Generate AI listing copy
router.post('/generate', async (req, res) => {
  try {
    const {
      propertyId,
      name,
      propertyType = 'villa',
      location = 'Anjuna',
      bedrooms = 2,
      bathrooms = 2,
      maxGuests = 4,
      amenities = [],
      description = ''
    } = req.body;

    let params = {
      name,
      propertyType,
      location,
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      maxGuests: Number(maxGuests),
      amenities,
      description
    };

    // If propertyId provided and details empty, pull from DB
    if (propertyId && !name) {
      const db = getDb();
      const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);
      if (prop) {
        params.name = prop.name;
        params.propertyType = prop.property_type;
        params.location = prop.location;
        params.bedrooms = prop.bedrooms;
        params.bathrooms = prop.bathrooms;
        params.maxGuests = prop.max_guests;
        params.amenities = JSON.parse(prop.amenities || '[]');
        params.description = prop.description || '';
      }
    }

    const result = await generateListing(params);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Listing generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Assess image quality & staging
router.post('/assess-image', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const assessment = await assessImageQuality(imageUrl);
    res.json({ success: true, data: assessment });
  } catch (error) {
    console.error('Image assessment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
