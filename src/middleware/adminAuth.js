const crypto = require('crypto');

const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

const sessions = new Map(); // token -> expiresAt

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function login(password) {
  if (!safeEqual(password || '', process.env.ADMIN_PASSWORD || '')) return null;
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function logout(token) {
  sessions.delete(token);
}

function isValid(token) {
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[SESSION_COOKIE];
  if (token && isValid(token)) return next();
  res.status(401).json({ error: 'Nao autenticado' });
}

module.exports = { requireAuth, login, logout, isValid, SESSION_COOKIE, SESSION_TTL_MS };
