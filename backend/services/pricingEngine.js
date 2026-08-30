const fs = require('fs');
const path = require('path');
const { chat } = require('./anthropicClient');

const compsFilePath = path.join(__dirname, '..', 'data', 'market-comps.json');
let compsData = {
  destinations: [],
  comparables: [],
  seasonMultipliers: {},
  locationTiers: {},
  amenityBoosts: {}
};

try {
  if (fs.existsSync(compsFilePath)) {
    compsData = JSON.parse(fs.readFileSync(compsFilePath, 'utf8'));
  }
} catch (err) {
  console.error('Error loading comps data:', err.message);
}

function getSeasonMultiplier(month) {
  // Peak: Dec, Jan, May, Oct
  if ([12, 1, 5, 10].includes(month)) {
    return { multiplier: 1.35, label: 'Peak Holiday / Festival Season (+35%)', season: 'peak' };
  }
  // High: Feb, Mar, Jun, Nov
  if ([2, 3, 6, 11].includes(month)) {
    return { multiplier: 1.18, label: 'High Season Inflow (+18%)', season: 'high' };
  }
  // Low: Jul, Aug
  if ([7, 8].includes(month)) {
    return { multiplier: 0.88, label: 'Monsoon / Value Season (-12%)', season: 'monsoon' };
  }
  return { multiplier: 1.0, label: 'Shoulder Season (Standard Pacing)', season: 'shoulder' };
}

function getLocationTier(location) {
  if (!location) return 'mid';
  const locLower = location.toLowerCase();

  // Known premium destinations
  const premiumKeywords = ['anjuna', 'assagao', 'vagator', 'manali', 'jaipur', 'bandra', 'dubai', 'bali', 'alibaug', 'south mumbai', 'ubud', 'seminyak', 'old manali', 'fontainhas', 'udaipur'];
  if (premiumKeywords.some(kw => locLower.includes(kw))) {
    return 'premium';
  }

  // Known budget/emerging
  const budgetKeywords = ['arambol', 'palolem', 'agonda', 'kasol', 'pushkar', 'hampi', 'varanasi', 'outskirts'];
  if (budgetKeywords.some(kw => locLower.includes(kw))) {
    return 'budget';
  }

  return 'mid';
}

function getLocationMultiplier(tier) {
  const multipliers = { premium: 1.20, mid: 1.05, budget: 0.90 };
  return multipliers[tier] || 1.0;
}

function calculateAmenityBoost(amenities = []) {
  let boost = 0;
  if (!Array.isArray(amenities)) return 0;
  const boosts = compsData.amenityBoosts || {
    pool: 0.20,
    sea_view: 0.18,
    mountain_view: 0.18,
    jacuzzi: 0.15,
    ac: 0.10,
    wifi: 0.05,
    kitchen: 0.08,
    breakfast: 0.08,
    parking: 0.04,
    garden: 0.05,
    fireplace: 0.10,
    bbq: 0.06
  };

  for (const amenity of amenities) {
    boost += boosts[amenity] || 0.04;
  }
  return Math.min(boost, 0.55); // Cap maximum amenity boost at +55%
}

function getDayOfWeekMultiplier(dateStr) {
  if (!dateStr) return { multiplier: 1.0, label: 'Standard Weekday Rate' };
  const date = new Date(dateStr);
  const day = date.getDay();
  if (day === 5 || day === 6) { // Friday or Saturday
    return { multiplier: 1.15, label: 'Weekend Surge (+15%)' };
  }
  return { multiplier: 1.0, label: 'Standard Weekday Rate' };
}

function findComparables(propertyType, location) {
  if (!compsData.comparables || !Array.isArray(compsData.comparables)) return [];
  const targetTier = getLocationTier(location);
  const locLower = (location || '').toLowerCase();

  return compsData.comparables
    .filter(c => {
      const typeMatch = propertyType ? c.type.toLowerCase() === propertyType.toLowerCase() : false;
      const locationMatch = location ? c.location.toLowerCase().includes(locLower) || locLower.includes(c.location.toLowerCase()) : false;
      const tierMatch = getLocationTier(c.location) === targetTier;
      return typeMatch || locationMatch || tierMatch;
    })
    .slice(0, 4);
}

function suggestPrice(params = {}) {
  const baseRate = Number(params.baseRate) || 4500;
  const propertyType = params.propertyType || 'villa';
  const location = params.location || 'Vacation Destination';
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
      factor: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Destination Demand (${location})`,
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
    const amenityNames = amenities.slice(0, 3).join(', ');
    factors.push({
      factor: `Key Amenities Boost (${amenityNames})`,
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
  const { propertyType = 'villa', location = 'Vacation Destination', bedrooms = 1, amenities = [] } = params;
  const { low, mid, high, season, factors = [] } = priceResult;

  const factorSummary = factors.map(f => `${f.factor}: ${f.impact}`).join('; ');

  const prompt = `You are a professional short-term rental revenue and pricing strategist. Generate a 2-3 sentence strategic explanation for a host about why you are suggesting this nightly rate range.

Property: ${propertyType} in ${location}, ${bedrooms} bedrooms
Amenities: ${amenities.join(', ') || 'Standard holiday amenities'}
Suggested range: ₹${low} – ₹${high} (recommended: ₹${mid})
Season: ${season}
Key factors: ${factorSummary}

Keep it conversational, mention the top 2-3 most impactful factors, and add one actionable revenue tip for hosting in ${location}. Use INR (₹). Reply with only the explanation text, no markdown headers or quotes.`;

  const llmResponse = await chat(
    'You are a professional vacation rental pricing advisor. Be concise, strategic, and practical.',
    prompt
  );

  if (llmResponse && llmResponse.trim().length > 20) {
    return llmResponse.trim();
  }

  // High quality domain-specific rule-based fallback
  const amenityText = amenities.length > 0 ? `high-demand amenities like ${amenities.slice(0, 2).join(' & ')}` : 'its prime location appeal';
  return `Your ${bedrooms}-bedroom ${propertyType} in ${location} is competitively positioned at ₹${mid.toLocaleString('en-IN')}/night (Optimal Range: ₹${low.toLocaleString('en-IN')} – ₹${high.toLocaleString('en-IN')}). Strong drivers include ${amenityText} and current ${season} pacing. Host tip: Offer a 10% discount for 4+ night stays to boost mid-week occupancy.`;
}

module.exports = { suggestPrice, generateExplanation, findComparables, compsData };
