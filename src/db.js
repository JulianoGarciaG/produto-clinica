const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'clinica.db'));
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    arrival_time TEXT NOT NULL,
    checkout_time TEXT,
    status TEXT NOT NULL DEFAULT 'waiting', -- waiting | done | removed
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
  CREATE INDEX IF NOT EXISTS idx_queue_arrival ON queue(arrival_time);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));
}

// Defaults na primeira execucao
const defaults = {
  avg_service_time_minutes: process.env.DEFAULT_SERVICE_TIME_MINUTES || '15',
  manual_override: 'false',
  queue_paused: 'false',
  last_updated_at: new Date().toISOString()
};
for (const [key, value] of Object.entries(defaults)) {
  if (getSetting(key) === null) setSetting(key, value);
}

module.exports = { db, getSetting, setSetting };
