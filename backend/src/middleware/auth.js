const { authenticateToken } = require('../services/auth/authService');

async function attachAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    req.auth = await authenticateToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Unable to validate session.' });
  }
}

function requireAuth(req, res, next) {
  if (!req.auth) return res.status(401).json({ success: false, error: 'A valid session is required.' });
  return next();
}

module.exports = { attachAuth, requireAuth };
