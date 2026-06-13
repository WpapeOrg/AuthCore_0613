const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const db = require('../db');

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }
  try {
    req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token 无效或已过期' });
  }
}

// 可选认证：有 token 则解析，无则继续
function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    } catch {}
  }
  next();
}

// 管理员认证
function adminMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(decoded.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '无权限，仅管理员可操作' });
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token 无效或已过期' });
  }
}

module.exports = { authMiddleware, optionalAuth, adminMiddleware };
