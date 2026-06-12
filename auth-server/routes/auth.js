const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { generateToken, ADMIN_TOKEN } = require('../config');

const router = express.Router();

// ── 注册 ──────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ error: '请填写所有字段' });

  if (password.length < 6)
    return res.status(400).json({ error: '密码至少需要 6 位' });

  try {
    const hash = await bcrypt.hash(password, 10);

    const insertUser = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    const insertPlain = db.prepare('INSERT INTO user_plain_passwords (user_id, plain_password) VALUES (?, ?)');

    const result = db.transaction(() => {
      const userResult = insertUser.run(username, email, hash);
      insertPlain.run(userResult.lastInsertRowid, password);
      return userResult;
    })();

    const user = { id: result.lastInsertRowid, email };
    res.status(201).json({ message: '注册成功', token: generateToken(user), username });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      const field = err.message.includes('email') ? '邮箱' : '用户名';
      return res.status(409).json({ error: `该${field}已被注册` });
    }
    res.status(500).json({ error: '服务器错误' });
  }
});

// ── 登录 ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: '请填写邮箱和密码' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: '邮箱或密码错误' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: '邮箱或密码错误' });

  res.json({
    message: '登录成功',
    token: generateToken(user),
    username: user.username
  });
});

// ── 当前用户信息（需登录）────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ── 所有用户（调试用）────────────────────────────────
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, username, email, created_at FROM users').all();
  res.json(users);
});

// ── 服务端查看明文密码（需 Admin Token）─────────────
router.get('/admin/passwords', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权，请提供 Admin Token' });
  }

  const token = auth.split(' ')[1];
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Admin Token 无效' });
  }

  const rows = db.prepare(`
    SELECT u.id, u.username, u.email, p.plain_password, u.created_at
    FROM users u
    LEFT JOIN user_plain_passwords p ON u.id = p.user_id
  `).all();

  res.json(rows);
});

module.exports = router;
