const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { populateSeedData } = require('./seed');

const DB_PATH = path.join(__dirname, 'toolkit.db');

let db = null;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Ensure schema is created
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schema);
    }

    // Auto-populate seed data if empty
    try {
      populateSeedData(db);
    } catch (e) {
      console.warn('Auto-seed check notice:', e.message);
    }
  }
  return db;
}

module.exports = { getDb, DB_PATH };
