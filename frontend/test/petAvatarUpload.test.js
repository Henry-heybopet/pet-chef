import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const avatarSource = fs.readFileSync(path.join(frontendRoot, 'src/utils/petAvatar.js'), 'utf8');
const formSource = fs.readFileSync(path.join(frontendRoot, 'src/components/DogSetup.jsx'), 'utf8');

test('宠物头像在进入 JSON 上传前缩放并统一压缩为 JPEG', () => {
  assert.match(avatarSource, /export function preparePetAvatarForUpload/);
  assert.match(avatarSource, /maxDimension = 1280/);
  assert.match(avatarSource, /Math\.min\(1, maxDimension \/ Math\.max\(image\.naturalWidth, image\.naturalHeight\)\)/);
  assert.match(avatarSource, /canvas\.toDataURL\('image\/jpeg', 0\.82\)/);
  assert.match(formSource, /setAvatar\(await preparePetAvatarForUpload\(file\)\)/);
  assert.doesNotMatch(formSource, /reader\.readAsDataURL\(file\)/);
});
