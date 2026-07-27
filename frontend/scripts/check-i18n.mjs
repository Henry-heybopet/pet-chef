import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { VALIDATION_REASON_KEYS, validateTranslationCatalog } from '../src/i18n/translations.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseUiFiles = [
  'src/App.jsx',
  'src/components/AIAnalysisScreen.jsx',
  'src/components/BottomTabBar.jsx',
  'src/components/CookingCenterPage.jsx',
  'src/components/CookingScreen.jsx',
  'src/components/DogSetup.jsx',
  'src/components/FreshCheckScreen.jsx',
  'src/components/FreshCheckRadar.jsx',
  'src/components/PetManagementScreen.jsx',
  'src/components/PetProfileDetails.jsx',
  'src/components/RecipeCategoryCatalog.jsx',
  'src/components/RecipeList.jsx',
  'src/components/RecipeMake.jsx',
  'src/components/TopBar.jsx',
];
const catalog = fs.readFileSync(path.join(root, 'src/i18n/translations.js'), 'utf8');
const errors = validateTranslationCatalog().map(key => `invalid 8-language entry: ${key}`);
const require = createRequire(import.meta.url);
const { VALIDATION_DETAIL_CODES } = require('../../backend/src/services/localization.js');
const directHanText = />\s*[^<{\n]*[\u3400-\u9fff][^<{\n]*</g;
const directHanAttribute = /(?:placeholder|title|aria-label|alt)="[^"]*[\u3400-\u9fff][^"]*"/g;

for (const relativePath of releaseUiFiles) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  for (const match of source.matchAll(/\bt\('([^']+)'/g)) {
    if (!catalog.includes(`'${match[1]}':`)) errors.push(`${relativePath}: missing translation key ${match[1]}`);
  }
  for (const pattern of [directHanText, directHanAttribute]) {
    for (const match of source.matchAll(pattern)) {
      const line = source.slice(0, match.index).split('\n').length;
      errors.push(`${relativePath}:${line}: direct user-visible Chinese: ${match[0].trim()}`);
    }
  }
}

for (const code of VALIDATION_DETAIL_CODES) {
  const key = VALIDATION_REASON_KEYS[code];
  if (!key) errors.push(`missing validation-details UI mapping: ${code}`);
  else if (!catalog.includes(`'${key}':`)) errors.push(`missing validation-details translation key: ${code} -> ${key}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`i18n check passed: ${releaseUiFiles.length} release UI files, 8 languages per key`);
