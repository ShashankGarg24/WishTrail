const AVATAR_COLORS = [
  '#F97316',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#6366F1',
  '#3B82F6',
  '#06B6D4',
  '#14B8A6',
  '#10B981',
  '#84CC16'
];

const cloudinaryService = require('../services/cloudinaryService');

const pickRandomColor = () => {
  const index = Math.floor(Math.random() * AVATAR_COLORS.length);
  return AVATAR_COLORS[index];
};

const extractInitial = (name = '', email = '') => {
  const source = String(name || '').trim() || String(email || '').trim();
  if (!source) {
    return 'U';
  }

  return source.charAt(0).toUpperCase();
};

const generateInitialAvatarSvg = ({ name = '', email = '' } = {}) => {
  const initial = extractInitial(name, email);
  const backgroundColor = pickRandomColor();

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="${initial}">
  <rect width="256" height="256" fill="${backgroundColor}" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="136" font-family="Arial, Helvetica, sans-serif" font-weight="450">${initial}</text>
</svg>
  `.trim();
};

const generateAndUploadInitialAvatar = async ({ name = '', email = '', username = '' } = {}) => {
  const svg = generateInitialAvatarSvg({ name, email });
  const svgBuffer = Buffer.from(svg, 'utf8');

  if (!cloudinaryService.isConfigured()) {
    return '';
  }

  const safeSeed = String(username || email || name || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 32) || 'user';

  const { url } = await cloudinaryService.uploadBuffer(svgBuffer, {
    folder: 'wishtrail/user/avatars',
    public_id: `initial_${safeSeed}_${Date.now()}`,
    overwrite: false,
    resource_type: 'image',
    format: 'svg'
  });

  return url || '';
};

module.exports = {
  generateAndUploadInitialAvatar
};
