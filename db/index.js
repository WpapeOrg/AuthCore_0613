const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "..", "users.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    avatar      TEXT    DEFAULT '',
    bio         TEXT    DEFAULT '',
    role        TEXT    DEFAULT 'user',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_plain_passwords (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL UNIQUE,
    plain_password TEXT    NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE,
    icon       TEXT    NOT NULL DEFAULT 'image',
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS images (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT    NOT NULL,
    category_id     INTEGER NOT NULL,
    thumbnail_path  TEXT    NOT NULL,
    hd_path         TEXT    NOT NULL,
    width           INTEGER NOT NULL DEFAULT 0,
    height          INTEGER NOT NULL DEFAULT 0,
    tags            TEXT    DEFAULT '',
    uploader_id     INTEGER,
    views           INTEGER NOT NULL DEFAULT 0,
    likes           INTEGER NOT NULL DEFAULT 0,
    group_id        TEXT    DEFAULT '',
    status          TEXT    DEFAULT 'pending',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (uploader_id)  REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS image_likes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id    INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(image_id, user_id),
    FOREIGN KEY (image_id) REFERENCES images(id),
    FOREIGN KEY (user_id)  REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id    INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    username    TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (image_id) REFERENCES images(id),
    FOREIGN KEY (user_id)  REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS feedbacks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,
    rating      INTEGER NOT NULL,
    content     TEXT    DEFAULT '',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ── 迁移：补齐旧表缺失字段 ────────────────────────────
try {
  db.exec("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''");
} catch {}
try {
  db.exec("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''");
} catch {}
try {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
} catch {}
try {
  db.exec("ALTER TABLE users ADD COLUMN age INTEGER");
} catch {}
try {
  db.exec("ALTER TABLE images ADD COLUMN views INTEGER DEFAULT 0");
} catch {}
try {
  db.exec("ALTER TABLE images ADD COLUMN likes INTEGER DEFAULT 0");
} catch {}
try {
  db.exec("ALTER TABLE images ADD COLUMN group_id TEXT DEFAULT ''");
} catch {}
try {
  db.exec("ALTER TABLE images ADD COLUMN status TEXT DEFAULT 'pending'");
} catch {}
try {
  db.exec("ALTER TABLE images ADD COLUMN uploader_name TEXT DEFAULT ''");
} catch {}
try {
  db.exec("ALTER TABLE images ADD COLUMN uploader_avatar TEXT DEFAULT ''");
} catch {}
// 兼容旧数据：如果 images 表缺少 category_id 列，则添加并默认指向第一个分类（id=1）
try {
  db.exec("ALTER TABLE images ADD COLUMN category_id INTEGER DEFAULT 1");
} catch {}

// ── 预置分类数据 ──────────────────────────────────────
const insertCategory = db.prepare(
  "INSERT OR IGNORE INTO categories (name, icon, sort_order) VALUES (?, ?, ?)",
);

const presetCategories = [
  ["壁纸", "wallpaper", 1],
  ["动漫", "anime", 2],
  ["美女", "beauty", 3],
  ["其他", "other", 4],
  ["18+", "adult", 5],
];

const insertAll = db.transaction(() => {
  for (const c of presetCategories) insertCategory.run(...c);
});
insertAll();

// ── 自动创建管理员（admin@admin.com / admin123）───────
const adminExists = db
  .prepare("SELECT id FROM users WHERE email = ?")
  .get("admin@admin.com");
if (!adminExists) {
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare(
    "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
  ).run("admin", "admin@admin.com", hash, "admin");
  console.log("[DB] 管理员账号已创建：admin@admin.com / admin123");
}

// ── 将已有图片的 status 为空的设为 approved（兼容旧数据）──
db.prepare(
  "UPDATE images SET status = 'approved' WHERE status = '' OR status IS NULL",
).run();
db.prepare(
  "UPDATE images SET status = 'approved' WHERE status = 'pending' AND group_id = ''",
).run();

module.exports = db;
