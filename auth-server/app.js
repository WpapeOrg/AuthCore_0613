const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');

const app = express();

// ── 全局中间件 ────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API 路由 ──────────────────────────────────────────
app.use('/api', authRoutes);

// ── 前端页面回退 ──────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
