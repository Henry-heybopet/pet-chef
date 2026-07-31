const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const configPath = require.resolve('../src/config/uploads');

function loadConfig(value) {
  if (value === undefined) delete process.env.PETCHEF_UPLOADS_DIR;
  else process.env.PETCHEF_UPLOADS_DIR = value;
  delete require.cache[configPath];
  return require(configPath);
}

test('shared upload directory uses one absolute root and relative public avatar URLs', () => {
  const previous = process.env.PETCHEF_UPLOADS_DIR;
  try {
    const root = path.resolve('/tmp/petchef-shared-uploads');
    const config = loadConfig(root);
    assert.equal(config.uploadsDir, root);
    assert.equal(config.avatarDir, path.join(root, 'avatars'));
    assert.equal(config.recipeUploadsDir, path.join(root, 'recipes'));
    assert.equal(config.avatarPublicUrl('pet.jpg'), '/uploads/avatars/pet.jpg');
    assert.throws(() => loadConfig('relative/uploads'), /must be an absolute path/);
  } finally {
    if (previous === undefined) delete process.env.PETCHEF_UPLOADS_DIR;
    else process.env.PETCHEF_UPLOADS_DIR = previous;
    delete require.cache[configPath];
  }
});
