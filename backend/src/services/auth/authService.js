const crypto = require('crypto');
const dns = require('dns').promises;

const Session = require('../../models/Session');
const User = require('../../models/User');

const TEST_SESSION_MS = 2 * 60 * 60 * 1000;
const LIVE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function validateEmailDomain(email) {
  const domain = normalizeEmail(email).split('@')[1];
  if (!domain || !/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
    throw new Error('Please use an email address with a valid domain, such as gmail.com or yahoo.com.');
  }

  try {
    const records = await dns.resolveMx(domain);
    if (!records.length) throw new Error('No mail server found.');
  } catch {
    throw new Error('Please use an email address with a genuine, reachable email domain.');
  }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const passwordHash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${passwordHash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, expected] = String(storedHash || '').split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

async function createSession({ mode, userId = null }) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + (mode === 'test' ? TEST_SESSION_MS : LIVE_SESSION_MS));
  const session = await Session.create({ tokenHash: hashToken(token), mode, userId, expiresAt });
  return { token, sessionId: session._id.toString(), mode, expiresAt };
}

async function authenticateToken(token) {
  if (!token) return null;
  const session = await Session.findOne({ tokenHash: hashToken(token) }).populate('userId').lean();
  if (!session || session.expiresAt <= new Date()) return null;
  return {
    sessionId: session._id,
    mode: session.mode,
    user: session.userId ? publicUser(session.userId) : null,
    expiresAt: session.expiresAt,
  };
}

async function signup({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!name || !normalizedEmail || !password || String(password).length < 8) {
    throw new Error('Name, email, and a password of at least 8 characters are required.');
  }
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error('Please provide a valid email address.');
  await validateEmailDomain(normalizedEmail);
  if (await User.exists({ email: normalizedEmail })) throw new Error('An account with this email already exists.');
  const user = await User.create({ name, email: normalizedEmail, passwordHash: hashPassword(password) });
  const session = await createSession({ mode: 'live', userId: user._id });
  return { ...session, user: publicUser(user) };
}

async function signin({ email, password }) {
  const user = await User.findOne({ email: normalizeEmail(email) }).select('+passwordHash');
  if (!user || !verifyPassword(password, user.passwordHash)) throw new Error('Invalid email or password.');
  const session = await createSession({ mode: 'live', userId: user._id });
  return { ...session, user: publicUser(user) };
}

async function createTestSession() {
  return createSession({ mode: 'test' });
}

module.exports = { authenticateToken, createTestSession, hashToken, signin, signup };
