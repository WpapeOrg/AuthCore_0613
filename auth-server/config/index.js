const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_secret_key_change_this_in_production';
const ADMIN_TOKEN = 'admin_secret_token_change_this_in_production';
const PORT = 3000;

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { JWT_SECRET, ADMIN_TOKEN, PORT, generateToken };
