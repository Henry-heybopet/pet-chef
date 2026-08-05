const test = require('node:test');
const assert = require('node:assert/strict');

const { NUTRITION_PACKS_DB, canonicalNutritionPackName } = require('../src/data/nutrition_packs_db');
const { NUTRITION_PACK_TRANSLATIONS } = require('../src/data/nutrition_pack_translations_db');
const { _test } = require('../src/services/nutrition_pack_repository');

test('nutrition pack catalog contains the requested nine unique categories', () => {
  assert.equal(NUTRITION_PACKS_DB.length, 9);
  assert.equal(new Set(NUTRITION_PACKS_DB.map(pack => pack.category_code)).size, 9);
  assert.deepEqual(NUTRITION_PACKS_DB.map(pack => pack.id), [
    'dog_pack_001', 'dog_pack_002', 'dog_pack_003', 'dog_pack_004', 'dog_pack_005',
    'dog_pack_006', 'dog_pack_007', 'dog_pack_008', 'dog_pack_009',
  ]);
  assert.ok(NUTRITION_PACKS_DB.every(pack => Object.hasOwn(pack, 'id')));
  assert.ok(NUTRITION_PACKS_DB.every(pack => ['幼犬', '成年犬', '老年犬'].includes(pack.life_stage)));
  assert.equal(NUTRITION_PACKS_DB.filter(pack => pack.pack_group === 'base').length, 4);
  assert.equal(NUTRITION_PACKS_DB.filter(pack => pack.pack_group === 'functional').length, 5);
});

test('pack API exposes pack_id and allocates the next dog_pack id', () => {
  assert.equal(_test.normalizePack({ id: 'dog_pack_003' }).pack_id, 'dog_pack_003');
  assert.equal(_test.nextPackId([{ id: 'dog_pack_009' }, { id: 'legacy_pack' }]), 'dog_pack_010');
});

test('legacy seven-pack names resolve to the canonical nine-pack catalog', () => {
  assert.equal(canonicalNutritionPackName('成犬维护营养包B'), '成年犬通用全价营养包');
  assert.equal(canonicalNutritionPackName('低敏单一蛋白营养包B'), '低敏无动物蛋白全价营养包');
});

test('validated catalog translations cover nine packs and eight locales', () => {
  assert.equal(NUTRITION_PACK_TRANSLATIONS.length, 72);
  assert.equal(new Set(NUTRITION_PACK_TRANSLATIONS.map(row => row.pack_id)).size, 9);
  assert.equal(new Set(NUTRITION_PACK_TRANSLATIONS.map(row => row.locale)).size, 8);
  assert.equal(new Set(NUTRITION_PACK_TRANSLATIONS.map(row => `${row.pack_id}:${row.locale}`)).size, 72);
  assert.equal(
    NUTRITION_PACK_TRANSLATIONS.find(row => row.pack_id === 'dog_pack_003' && row.locale === 'en')?.name,
    'Adult Dog General Complete Nutrition Pack'
  );
});

test('pack classification accepts only the two groups and three life stages', () => {
  assert.equal(_test.validatePackClassification('base', '幼犬'), '');
  assert.match(_test.validatePackClassification('other', '幼犬'), /分类/);
  assert.match(_test.validatePackClassification('functional', '全部'), /生命阶段/);
});

test('new brain and joint packs remain drafts until reviewed composition exists', () => {
  const pending = NUTRITION_PACKS_DB.filter(pack => ['brain_support', 'joint_support'].includes(pack.category_code));
  assert.deepEqual(pending.map(pack => pack.status), ['draft', 'draft']);
});

test('active composition validation requires complete explicit sources', () => {
  assert.match(_test.validateComposition({ '维生素预混料': 1 }), /矿物质|钙/);
  assert.equal(_test.validateComposition({
    '维矿预混料（含铁铜锌锰碘硒等微量元素）': 1.7,
    '钙磷矿物粉（Ca:P=1.3:1）': 1,
    'Omega-3藻油 DHA EPA': 1.3,
  }), '');
});

test('seed migration selects the most frequent legacy recipe composition and marks conflicts', () => {
  const rows = [
    { nutrition_snapshot: { b_pack: { A: 1 }, calcium_pct: 1.2 } },
    { nutrition_snapshot: { b_pack: { A: 1 }, calcium_pct: 1.2 } },
    { nutrition_snapshot: { b_pack: { B: 2 }, calcium_pct: 1.5 } },
  ];
  const selected = _test.mostFrequentRecipeSnapshot(rows);
  assert.deepEqual(selected.composition, { A: 1 });
  assert.equal(selected.nutrition_snapshot.calcium_pct, 1.2);
  assert.equal(selected.data_conflict, true);
});
