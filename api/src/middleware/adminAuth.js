const jwt = require('jsonwebtoken');

const LOCALHOST_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

const normalizeIp = (value = '') => {
  if (!value) return '';
  const raw = String(value).split(',')[0].trim();
  if (raw.startsWith('::ffff:')) return raw.replace('::ffff:', '');
  return raw;
};

const getRequestIp = (req) => {
  // Let Express resolve the trusted proxy chain; never trust a caller's raw header.
  return normalizeIp(req.ip || req.socket?.remoteAddress || '');
};

const getAllowedAdminIps = () => {
  const fromEnv = (process.env.ADMIN_ALLOWED_IPS || '')
    .split(',')
    .map((ip) => normalizeIp(ip))
    .filter(Boolean);

  if (fromEnv.length === 0) {
    return LOCALHOST_IPS;
  }

  return new Set(fromEnv);
};

const signAdminToken = (payload) => {
  const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('ADMIN_JWT_SECRET or JWT_SECRET must be configured');
  }

  return jwt.sign(payload, secret, {
    expiresIn: process.env.ADMIN_JWT_EXPIRES || '8h'
  });
};

const isAllowedAdminIp = (req) => {
  if (!(process.env.ADMIN_ALLOWED_IPS || '').trim()) return true;
  return getAllowedAdminIps().has(getRequestIp(req));
};

const requireAdminAuth = (req, res, next) => {
  if (!isAllowedAdminIp(req)) {
    return res.status(403).json({ success: false, message: 'Admin access denied for this IP' });
  }
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }

  const token = authHeader.slice(7);
  const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

  try {
    const decoded = jwt.verify(token, secret);
    if (decoded?.scope !== 'admin-panel') {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin token'
      });
    }

    const requestIp = getRequestIp(req);
    if (decoded?.ip && requestIp && decoded.ip !== requestIp) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin token for this IP'
      });
    }

    req.admin = {
      email: decoded.email,
      ip: decoded.ip
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired admin token'
    });
  }
};

module.exports = {
  getRequestIp,
  isAllowedAdminIp,
  signAdminToken,
  requireAdminAuth
};
