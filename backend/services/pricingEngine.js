const fs = require('fs');
const path = require('path');
const { chat } = require('./anthropicClient');

const compsFilePath = path.join(__dirname, '..', 'data', 'goa-comps.json');
let compsData = {
  comparables: [],
  seasonMultipliers: {},
  locationTiers: {},
  amenityBoosts: {}
};

try {
  compsData = JSON.parse(fs.readFileSync(compsFilePath, 'utf8'));
} catch (err) {
  console.error('Error loading comps data:', err.message);
}

function getSeasonMultiplier(month) {
  if (compsData.seasonMultipliers) {
    for (const [season, config] of Object.entries(compsData.seasonMultipliers)) {
      if (config.months && config.months.includes(month)) {
        return { multiplier: config.multiplier, label: config.label, season };
      }
    }
  }
  return { multiplier: 1.0, label: 'Standard Season (Sep/Apr-May)', season: 'shoulder' };
}

function getLocationTier(location) {
  if (!location) return 'mid';
  if (compsData.locationTiers) {
    for (const [tier, locations] of Object.entries(compsData.locationTiers)) {
      if (locations.map(l => l.toLowerCase()).includes(location.toLowerCase())) {
        return tier;
      }
    }
  }
  return 'mid';
}

function getLocationMultiplier(tier) {
  const multipliers = { premium: 1.15, mid: 1.0, budget: 0.85 };
  return multipliers[tier] || 1.0;
}

function calculateAmenityBoost(amenities = []) {
  let boost = 0;
  if (!Array.isArray(amenities)) return 0;
  for (const amenity of amenities) {
    boost += (compsData.amenityBoosts && compsData.amenityBoosts[amenity]) || 0;
  }
  return boost;
}

function getDayOfWeekMultiplier(dateStr) {
  if (!dateStr) return { multiplier: 1.0, label: 'Weekday Pricing' };
  const date = new Date(dateStr);
  const day = date.getDay();
  if (day === 5 || day === 6) { // Friday or Saturday
    return { multiplier: 1.15, label: 'Weekend Surge (+15%)' };
  }
  return { multiplier: 1.0, label: 'Standard Weekday' };
}

function findComparables(propertyType, location) {
  if (!compsData.comparables || !Array.isArray(compsData.comparables)) return [];
  const targetTier = getLocationTier(location);

  return compsData.comparables
    .filter(c => {
      const typeMatch = propertyType ? c.type.toLowerCase() === propertyType.toLowerCase() : false;
      const locationMatch = location ? c.location.toLowerCase() === location.toLowerCase() : false;
      const tierMatch = getLocationTier(c.location) === targetTier;
      return typeMatch || locationMatch || tierMatch;
    })
    .slice(0, 4);
}

function suggestPrice(params = {}) {
  const baseRate = Number(params.baseRate) || 3000;
  const propertyType = params.propertyType || 'villa';
  const location = params.location || 'Anjuna';
  const bedrooms = Number(params.bedrooms) || 1;
  const amenities = Array.isArray(params.amenities) ? params.amenities : [];
  const checkIn = params.checkIn || null;

  const factors = [];
  let rate = baseRate;

  // Factor 1: Base rate
  factors.push({
    factor: 'Base Nightly Rate',
    impact: `₹${baseRate.toLocaleString('en-IN')}`,
    direction: 'base',
    value: baseRate
  });

  // Factor 2: Location tier
  const tier = getLocationTier(location);
  const locMultiplier = getLocationMultiplier(tier);
  if (locMultiplier !== 1.0) {
    const pct = Math.round((locMultiplier - 1) * 100);
    factors.push({
      factor: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Location (${location})`,
      impact: `${pct > 0 ? '+' : ''}${pct}%`,
      direction: pct > 0 ? 'up' : 'down',
      value: pct
    });
    rate *= locMultiplier;
  }

  // Factor 3: Season
  const month = checkIn ? new Date(checkIn).getMonth() + 1 : new Date().getMonth() + 1;
  const season = getSeasonMultiplier(month);
  if (season.multiplier !== 1.0) {
    const pct = Math.round((season.multiplier - 1) * 100);
    factors.push({
      factor: season.label,
      impact: `${pct > 0 ? '+' : ''}${pct}%`,
      direction: pct > 0 ? 'up' : 'down',
      value: pct
    });
    rate *= season.multiplier;
  } else {
    factors.push({
      factor: season.label,
      impact: '0%',
      direction: 'neutral',
      value: 0
    });
  }

  // Factor 4: Amenities
  const amenityBoost = calculateAmenityBoost(amenities);
  if (amenityBoost > 0) {
    const pct = Math.round(amenityBoost * 100);
    const amenityNames = amenities.join(', ');
    factors.push({
      factor: `Amenities (${amenityNames})`,
      impact: `+${pct}%`,
      direction: 'up',
      value: pct
    });
    rate *= (1 + amenityBoost);
  }

  // Factor 5: Day of week
  const dayInfo = getDayOfWeekMultiplier(checkIn);
  if (dayInfo.multiplier !== 1.0) {
    factors.push({
      factor: dayInfo.label,
      impact: '+15%',
      direction: 'up',
      value: 15
    });
    rate *= dayInfo.multiplier;
  }

  // Factor 6: Bedroom adjustment
  if (bedrooms > 1) {
    const bedroomBoost = (bedrooms - 1) * 0.12;
    const pct = Math.round(bedroomBoost * 100);
    factors.push({
      factor: `${bedrooms} Bedrooms Capacity`,
      impact: `+${pct}%`,
      direction: 'up',
      value: pct
    });
    rate *= (1 + bedroomBoost);
  }

  const mid = Math.round(rate / 100) * 100;
  const low = Math.round(mid * 0.82 / 100) * 100;
  const high = Math.round(mid * 1.18 / 100) * 100;

  const comps = findComparables(propertyType, location);

  return {
    baseRate,
    low,
    mid,
    high,
    factors,
    comparables: comps,
    season: season.label,
    tier
  };
}

async function generateExplanation(priceResult, params = {}) {
  const { propertyType = 'villa', location = 'Anjuna', bedrooms = 1, amenities = [] } = params;
  const { low, mid, high, season, factors = [] } = priceResult;

  const factorSummary = factors.map(f => `${f.factor}: ${f.impact}`).join('; ');

  const prompt = `You are a short-term rental pricing expert in Goa, India. Generate a 2-3 sentence strategic explanation for a host about why you are suggesting this nightly rate range.

Property: ${propertyType} in ${location}, ${bedrooms} bedrooms
Amenities: ${amenities.join(', ') || 'Standard amenities'}
Suggested range: ₹${low} – ₹${high} (recommended: ₹${mid})
Season: ${season}
Key factors: ${factorSummary}

Keep it conversational, mention the top 2-3 most impactful factors, and add one actionable revenue tip for Goa hosting. Use INR (₹). Reply with only the explanation text, no markdown headers or quotes.`;

  const llmResponse = await chat(
    'You are a Goa rental market pricing advisor. Be concise and helpful.',
    prompt
  );

  if (llmResponse && llmResponse.trim().length > 20) {
    return llmResponse.trim();
  }

  // High quality domain-specific rule-based fallback
  const amenityText = amenities.length > 0 ? `high-demand features like ${amenities.slice(0, 2).join(' & ')}` : 'its strategic Goan positioning';
  return `Your ${bedrooms}-bedroom ${propertyType} in ${location} is competitively pegged at ₹${mid.toLocaleString('en-IN')}/night (Range: ₹${low.toLocaleString('en-IN')} – ₹${high.toLocaleString('en-IN')}). Strong factors include ${amenityText} and current ${season} demand. Pro-tip: Enable instant booking for weekend slots to capture up to 15% higher average daily rates.`;
}

module.exports = { suggestPrice, generateExplanation, findComparables, compsData };
