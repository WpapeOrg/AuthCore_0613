const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { generateToken, ADMIN_TOKEN } = require('../config');

const router = express.Router();

// ── 头像上传的 multer 配置 ───────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'avatar_' + req.user.id + '_' + Date.now() + ext);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

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

    const user = { id: result.lastInsertRowid, email, role: 'user' };
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
    username: user.username,
    role: user.role
  });
});

// ── 当前用户信息（需登录）────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, email, avatar, bio, role, age, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ── 头像上传（需登录）────────────────────────────────
router.post('/upload-avatar', authMiddleware, avatarUpload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择图片文件' });
  }

  // 构造可访问的 URL 路径
  const avatarUrl = '/uploads/avatars/' + req.file.filename;

  // 更新数据库
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarUrl, req.user.id);

  res.json({ message: '头像已更新', avatar: avatarUrl });
});

// ── 修改个人资料（需登录）────────────────────────────
router.put('/user/profile', authMiddleware, (req, res) => {
  const { avatar, bio, username, age } = req.body;
  const fields = [];
  const params = [];

  if (avatar !== undefined) { fields.push('avatar = ?'); params.push(avatar); }
  if (bio !== undefined)    { fields.push('bio = ?');    params.push(bio);    }
  if (username !== undefined) { fields.push('username = ?'); params.push(username); }
  if (age !== undefined) {
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return res.status(400).json({ error: '年龄需在 1-120 之间' });
    }
    fields.push('age = ?');
    params.push(ageNum);
  }

  if (fields.length === 0) return res.status(400).json({ error: '没有要修改的字段' });

  params.push(req.user.id);
  try {
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    res.json({ message: '资料已更新' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: '用户名已被占用' });
    res.status(500).json({ error: '服务器错误' });
  }
});

// ── 我的发布（需登录）────────────────────────────────
router.get('/user/images', authMiddleware, (req, res) => {
  const images = db.prepare(`
    SELECT i.*, c.name as category_name
    FROM images i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE i.uploader_id = ?
    ORDER BY i.created_at DESC
  `).all(req.user.id);
  res.json(images);
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

// ── 用户反馈（需登录）────────────────────────────────
router.post('/feedback', authMiddleware, (req, res) => {
  const { rating, content } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: '请提供 1-5 的评分' });
  }

  try {
    db.prepare('INSERT INTO feedbacks (user_id, rating, content) VALUES (?, ?, ?)').run(
      req.user.id,
      rating,
      content || ''
    );
    res.json({ message: '感谢您的反馈！' });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
