const cloudinary = require('cloudinary').v2;
const path = require('path');

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const CLOUDINARY_UPLOAD_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || 'wishtrail/feedback';

function isConfigured() {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
}

if (isConfigured()) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

async function upload(localFilePath, options = {}) {
  if (!isConfigured()) return { url: '', id: '' };
  const uploadOptions = {
    folder: CLOUDINARY_UPLOAD_FOLDER,
    resource_type: 'image',
    overwrite: false,
    unique_filename: true,
    use_filename: false,
    ...options,
  };
  const result = await cloudinary.uploader.upload(localFilePath, uploadOptions);
  return { url: result.secure_url || result.url || '', id: result.public_id || '' };
}

function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) return resolve({ url: '', id: '' });
    const uploadOptions = {
      folder: CLOUDINARY_UPLOAD_FOLDER,
      resource_type: 'image',
      overwrite: false,
      unique_filename: true,
      use_filename: false,
      ...options,
    };
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
      if (err) return reject(err);
      return resolve({ url: result.secure_url || result.url || '', id: result.public_id || '' });
    });
    stream.end(buffer);
  });
}

async function destroy(publicId) {
  if (!isConfigured() || !publicId) return false;
  const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  return res.result === 'ok';
}

module.exports = {
  isConfigured,
  upload,
  uploadBuffer,
  destroy,
}; 