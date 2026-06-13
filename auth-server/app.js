const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/images');

const app = express();

// ── 全局中间件 ────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// 上传文件静态服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API 路由 ──────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api', imageRoutes);

// ── HTML 页面路由 ──────────────────────────────────────
// 静态文件中间件已覆盖 public/ 下的 .html 文件
// 此 catch-all 仅对非文件路由回退到 index.html
app.get('*', (req, res) => {
  // 已匹配静态文件的不走到这里
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
