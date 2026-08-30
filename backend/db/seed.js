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

  // Clear existing hosts and properties to re-seed multi-destination portfolio
  db.exec(`
    DELETE FROM bookings;
    DELETE FROM pricing_logs;
    DELETE FROM properties;
    DELETE FROM hosts;
  `);

  // Insert demo host
  const insertHost = db.prepare(
    'INSERT INTO hosts (name, phone, email) VALUES (?, ?, ?)'
  );
  const hostResult = insertHost.run('Rajesh Naik', '+919876543210', 'rajesh.naik@wayzyy.com');
  const hostId = hostResult.lastInsertRowid;

  // Insert 4 multi-destination demo properties
  const insertProperty = db.prepare(`
    INSERT INTO properties (host_id, name, property_type, location, location_tier, bedrooms, bathrooms, max_guests, base_rate, amenities, description, image_urls, listing_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Casa Azul (Coastal Villa)
  const prop1 = insertProperty.run(
    hostId,
    'Casa Azul Pool Villa',
    'villa',
    'Anjuna, Goa',
    'premium',
    2,
    2,
    6,
    4500,
    JSON.stringify(['pool', 'ac', 'wifi', 'kitchen', 'parking']),
    'A charming 2-bedroom boutique villa nestled 5 minutes from the coast. Features a private swimming pool, lush tropical garden, high-speed WiFi, and fully equipped modular kitchen. Ideal for families and group getaways.',
    JSON.stringify([
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
    ]),
    9.2
  );

  // 2. Cedar Peak Chalet (Mountain Chalet)
  const prop2 = insertProperty.run(
    hostId,
    'Cedar Peak Chalet',
    'villa',
    'Old Manali, Himachal',
    'premium',
    3,
    3,
    8,
    5800,
    JSON.stringify(['mountain_view', 'fireplace', 'wifi', 'kitchen', 'parking', 'bbq']),
    'Perched amidst whispering pine forests, this handcrafted Himalayan cedar-wood chalet offers panoramic snow-peak views, an indoor stone fireplace, high-speed fiber internet, and cozy wooden sun-decks.',
    JSON.stringify([
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80'
    ]),
    9.5
  );

  // 3. Haveli Heritage Stay (Cultural/Heritage Suite)
  const prop3 = insertProperty.run(
    hostId,
    'Haveli Heritage Stay',
    'heritage_room',
    'Old City, Jaipur',
    'premium',
    1,
    1,
    3,
    3200,
    JSON.stringify(['ac', 'wifi', 'breakfast', 'garden']),
    'Experience regal charm at this restored 19th-century royal suite in the historic heart of the Pink City. Hand-carved archways, courtyards, authentic artisan breakfasts, and private rooftop sunset views.',
    JSON.stringify([
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'
    ]),
    9.1
  );

  // 4. The Skyline Penthouse (City Loft)
  const prop4 = insertProperty.run(
    hostId,
    'The Skyline Penthouse',
    'apartment',
    'Bandra West, Mumbai',
    'premium',
    2,
    2,
    4,
    7500,
    JSON.stringify(['ac', 'wifi', 'city_view', 'kitchen', 'parking']),
    'Designer sea-breeze penthouse in the vibrant epicenter of Bandra. Floor-to-ceiling glass windows with panoramic city views, modern minimalist decor, superfast WiFi, and walkable access to top cafes and boutiques.',
    JSON.stringify([
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
    ]),
    9.4
  );

  const id1 = prop1.lastInsertRowid;
  const id2 = prop2.lastInsertRowid;
  const id3 = prop3.lastInsertRowid;
  const id4 = prop4.lastInsertRowid;

  // Insert demo bookings
  const insertBooking = db.prepare(`
    INSERT INTO bookings (property_id, guest_name, guest_phone, check_in, check_out, guests, total_amount, nightly_rate, status, source, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Casa Azul bookings
  insertBooking.run(id1, 'Ankit Sharma', '+919812345678', '2026-09-05', '2026-09-08', 4, 13500, 4500, 'confirmed', 'whatsapp', 'Requested early check-in at 12 PM');
  insertBooking.run(id1, 'Priya Mehta', '+919823456789', '2026-09-12', '2026-09-15', 2, 14400, 4800, 'confirmed', 'direct', 'Celebrating anniversary');
  insertBooking.run(id1, 'Sneha Reddy', '+919834567890', '2026-10-01', '2026-10-04', 3, 17550, 5850, 'confirmed', 'whatsapp', 'Repeat guest');

  // Cedar Peak Chalet bookings
  insertBooking.run(id2, 'Arjun Varma', '+919845678901', '2026-09-10', '2026-09-14', 6, 23200, 5800, 'confirmed', 'whatsapp', 'Mountain hiking expedition group');
  insertBooking.run(id2, 'David Miller', '+447911123456', '2026-09-20', '2026-09-25', 4, 29000, 5800, 'pending', 'platform', 'Needs fireplace wood stocked');

  // Haveli Heritage Stay bookings
  insertBooking.run(id3, 'Lisa Chen', '+8613912345678', '2026-09-08', '2026-09-11', 2, 9600, 3200, 'completed', 'direct', 'Artisan heritage photography');
  insertBooking.run(id3, 'Vikram Joshi', '+919856789012', '2026-09-18', '2026-09-20', 2, 6400, 3200, 'confirmed', 'whatsapp', 'Cultural holiday');

  // The Skyline Penthouse bookings
  insertBooking.run(id4, 'Marco Rossi', '+393331234567', '2026-09-06', '2026-09-09', 2, 22500, 7500, 'confirmed', 'direct', 'Executive business & leisure travel');
  insertBooking.run(id4, 'Kavita Iyer', '+919867890123', '2026-09-16', '2026-09-19', 3, 22500, 7500, 'confirmed', 'whatsapp', 'Bandra weekend staycation');

  // Insert demo pricing logs
  const insertPricing = db.prepare(`
    INSERT INTO pricing_logs (property_id, suggested_low, suggested_mid, suggested_high, factors, explanation, date_range_start, date_range_end)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPricing.run(
    id1,
    4200,
    5100,
    6000,
    JSON.stringify([
      { factor: 'Base Nightly Rate', impact: '₹4,500', direction: 'base' },
      { factor: 'Prime Location Demand', impact: '+15%', direction: 'up' },
      { factor: 'Pool & AC Amenities', impact: '+30%', direction: 'up' },
      { factor: 'Shoulder Season', impact: '0%', direction: 'neutral' }
    ]),
    'Your villa commands strong demand due to the private pool and prime coastal setting. Current shoulder season provides steady baseline occupancy; prepare to increase rates for upcoming peak holiday weekends.',
    '2026-09-01',
    '2026-09-30'
  );

  console.log('✅ Multi-destination database data populated successfully');
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
