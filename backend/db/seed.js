const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'toolkit.db');

function populateSeedData(db) {
  // Ensure schema is executed
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
  }

  // Check if host already exists
  const hostCheck = db.prepare('SELECT COUNT(*) as count FROM hosts').get();
  if (hostCheck && hostCheck.count > 0) {
    return;
  }

  // Insert demo host
  const insertHost = db.prepare(
    'INSERT INTO hosts (name, phone, email) VALUES (?, ?, ?)'
  );
  insertHost.run('Rajesh Naik', '+919876543210', 'rajesh.naik@wayzyy.com');

  // Insert 3 demo properties
  const insertProperty = db.prepare(`
    INSERT INTO properties (host_id, name, property_type, location, location_tier, bedrooms, bathrooms, max_guests, base_rate, amenities, description, image_urls, listing_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProperty.run(
    1,
    'Casa Azul',
    'villa',
    'Anjuna',
    'premium',
    2,
    2,
    6,
    4500,
    JSON.stringify(['pool', 'ac', 'wifi', 'kitchen', 'parking']),
    'A charming 2-bedroom Portuguese-style villa nestled in the heart of Anjuna, just 5 minutes from the beach. Features a private pool, lush tropical garden, high-speed WiFi, and fully equipped modular kitchen. Perfect for families and group getaways.',
    JSON.stringify([
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
    ]),
    8.8
  );

  insertProperty.run(
    1,
    "Pinto's Heritage Stay",
    'heritage_room',
    'Fontainhas',
    'premium',
    1,
    1,
    2,
    2800,
    JSON.stringify(['ac', 'wifi', 'breakfast']),
    'Step back in time at this beautifully restored heritage room in the colorful Latin Quarter of Fontainhas, Panaji. Featuring vintage rosewood furniture, traditional Goan architecture, daily homemade breakfast, and bespoke neighborhood walking trails.',
    JSON.stringify([
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'
    ]),
    9.2
  );

  insertProperty.run(
    1,
    'Sunset Shack',
    'beach_hut',
    'Palolem',
    'budget',
    1,
    1,
    2,
    1800,
    JSON.stringify(['wifi', 'sea_view']),
    'Wake up to the rhythmic sound of waves at this cozy beachfront wooden eco-hut right on Palolem beach. Unobstructed sunset views over the Arabian Sea, hammocks, fresh sea breeze, and direct sandy beach access.',
    JSON.stringify([
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80'
    ]),
    7.9
  );

  // Insert demo bookings
  const insertBooking = db.prepare(`
    INSERT INTO bookings (property_id, guest_name, guest_phone, check_in, check_out, guests, total_amount, nightly_rate, status, source, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Casa Azul bookings
  insertBooking.run(1, 'Ankit Sharma', '+919812345678', '2026-09-05', '2026-09-08', 4, 13500, 4500, 'confirmed', 'whatsapp', 'Requested early check-in at 12 PM');
  insertBooking.run(1, 'Priya Mehta', '+919823456789', '2026-09-12', '2026-09-15', 2, 14400, 4800, 'confirmed', 'direct', 'Celebrating anniversary');
  insertBooking.run(1, 'David Wilson', '+447911123456', '2026-09-20', '2026-09-25', 6, 27000, 5400, 'pending', 'platform', 'Needs airport taxi pickup');
  insertBooking.run(1, 'Sneha Reddy', '+919834567890', '2026-10-01', '2026-10-04', 3, 17550, 5850, 'confirmed', 'whatsapp', 'Repeat guest');
  insertBooking.run(1, 'Marco Rossi', '+393331234567', '2026-10-10', '2026-10-14', 4, 23400, 5850, 'confirmed', 'platform', 'Dietary preference: vegan breakfast');

  // Pinto's Heritage Stay bookings
  insertBooking.run(2, 'Vikram Joshi', '+919845678901', '2026-09-01', '2026-09-03', 2, 5600, 2800, 'completed', 'direct', 'Solo heritage photographer');
  insertBooking.run(2, 'Lisa Chen', '+8613912345678', '2026-09-10', '2026-09-13', 2, 9240, 3080, 'confirmed', 'platform', 'Interested in Portuguese heritage tour');
  insertBooking.run(2, 'Arun Kumar', '+919856789012', '2026-09-18', '2026-09-20', 1, 5600, 2800, 'confirmed', 'whatsapp', 'Workation setup requested');

  // Sunset Shack bookings
  insertBooking.run(3, 'Meera Patel', '+919867890123', '2026-09-07', '2026-09-10', 2, 5400, 1800, 'confirmed', 'whatsapp', 'Yoga enthusiast');
  insertBooking.run(3, 'Tom Anderson', '+614123456789', '2026-09-15', '2026-09-20', 2, 9000, 1800, 'pending', 'platform', 'Kayaking tour requested');

  // Insert demo pricing logs
  const insertPricing = db.prepare(`
    INSERT INTO pricing_logs (property_id, suggested_low, suggested_mid, suggested_high, factors, explanation, date_range_start, date_range_end)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPricing.run(
    1,
    4200,
    5100,
    6000,
    JSON.stringify([
      { factor: 'Base Nightly Rate', impact: '₹4,500', direction: 'base' },
      { factor: 'Premium Location (Anjuna)', impact: '+15%', direction: 'up' },
      { factor: 'Pool & AC Amenities', impact: '+30%', direction: 'up' },
      { factor: 'Shoulder Season (Sep)', impact: '0%', direction: 'neutral' }
    ]),
    'Your villa in Anjuna commands strong demand due to the private pool and prime coastal location. Current shoulder season provides steady baseline occupancy; prepare to increase rates up to 1.8x for the upcoming Dec-Feb peak season.',
    '2026-09-01',
    '2026-09-30'
  );

  insertPricing.run(
    2,
    2600,
    3080,
    3600,
    JSON.stringify([
      { factor: 'Base Nightly Rate', impact: '₹2,800', direction: 'base' },
      { factor: 'Heritage Premium (Fontainhas)', impact: '+15%', direction: 'up' },
      { factor: 'Complimentary Breakfast', impact: '+7%', direction: 'up' },
      { factor: 'Single Bedroom', impact: '0%', direction: 'neutral' }
    ]),
    'Heritage rooms in Fontainhas have high cultural appeal for cultural travelers. Your homemade breakfast inclusion boosts guest value. Consider pushing rates by +25% for upcoming festival weekends in October.',
    '2026-09-01',
    '2026-09-30'
  );

  console.log('✅ Demo database data populated');
}

function seed() {
  if (fs.existsSync(DB_PATH)) {
    try {
      fs.unlinkSync(DB_PATH);
    } catch (e) {
      console.warn('Could not unlink existing DB:', e.message);
    }
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  populateSeedData(db);
  db.close();
}

if (require.main === module) {
  seed();
}

module.exports = { populateSeedData, seed, DB_PATH };
