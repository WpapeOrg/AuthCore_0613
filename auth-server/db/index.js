const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'users.db');
const db = new Database(dbPath);

// 启用 WAL 模式提升并发性能
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_plain_passwords (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL UNIQUE,
    plain_password TEXT    NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

module.exports = db;
