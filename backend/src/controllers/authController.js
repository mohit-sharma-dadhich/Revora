const { createTestSession, signin, signup } = require('../services/auth/authService');

function sendSession(res, session) {
  return res.status(200).json({
    success: true,
    data: {
      token: session.token,
      sessionId: session.sessionId,
      mode: session.mode,
      expiresAt: session.expiresAt,
      user: session.user || null,
    },
  });
}

async function createTest(req, res) {
  try {
    if (req.auth?.mode === 'test') {
      const authorization = req.get('authorization') || '';
      return sendSession(res, {
        token: authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : null,
        sessionId: req.auth.sessionId.toString(),
        mode: req.auth.mode,
        expiresAt: req.auth.expiresAt,
        user: req.auth.user,
      });
    }

    return sendSession(res, await createTestSession());
  } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
}

async function signUp(req, res) {
  try { return sendSession(res, await signup(req.body || {})); } catch (error) { return res.status(400).json({ success: false, error: error.message }); }
}

async function signIn(req, res) {
  try { return sendSession(res, await signin(req.body || {})); } catch (error) { return res.status(401).json({ success: false, error: error.message }); }
}

function currentUser(req, res) {
  if (!req.auth) return res.status(401).json({ success: false, error: 'A valid session is required.' });
  return res.status(200).json({ success: true, data: { mode: req.auth.mode, expiresAt: req.auth.expiresAt, user: req.auth.user } });
}

module.exports = { createTest, signIn, signUp, currentUser };
