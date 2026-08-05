const path = require('path');

const configuredUploadsDir = String(process.env.PETCHEF_UPLOADS_DIR || '').trim();
if (configuredUploadsDir && !path.isAbsolute(configuredUploadsDir)) {
  throw new Error('PETCHEF_UPLOADS_DIR must be an absolute path');
}

const uploadsDir = configuredUploadsDir || path.resolve(__dirname, '../../public/uploads');
const avatarDir = path.join(uploadsDir, 'avatars');
const recipeUploadsDir = path.join(uploadsDir, 'recipes');
const nutritionPackUploadsDir = path.join(uploadsDir, 'nutrition-packs');

function avatarPublicUrl(filename) {
  return `/uploads/avatars/${filename}`;
}

module.exports = {
  uploadsDir,
  avatarDir,
  recipeUploadsDir,
  nutritionPackUploadsDir,
  avatarPublicUrl,
};
