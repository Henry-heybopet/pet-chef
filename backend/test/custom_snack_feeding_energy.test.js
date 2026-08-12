const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../src/services/heybo_store');

test('零食自制把实际喂食克数按启动快照的每克能量写入，并可按日汇总', () => {
  store.resetForTests();
  const user = store.createUserForTests({ login: 'snack-energy@example.com', provider: 'email' }).user;
  const pet = store.createPet(user.id, { name: 'xixi', species: 'dog' });
  const operation = store.createCookingOperation(user.id, {
    session_id: 'snack-energy-session',
    pet_id: pet.id,
    pet_name: pet.name,
    recipe_id: 'custom-snack',
    recipe_name: '零食自制',
    total_weight_g: 120,
    is_custom_snack: true,
    ingredients_snapshot: [{ name: '鸡胸肉', grams: 120 }],
    estimated_energy: { kcalPerGram: 1.65, source: 'local_database' },
  }, { petOwnershipVerified: true });

  const record = store.createFeedingRecord(user.id, {
    pet_id: pet.id,
    cooking_operation_id: operation.id,
    session_id: operation.session_id,
    amount_g: 30,
    palatability: 'all',
    stool_status: 'normal',
  }, { petOwnershipVerified: true });

  assert.equal(record.amount_g, 30);
  assert.equal(record.meal_type, 'snack');
  assert.equal(record.estimated_kcal, 49.5);
  assert.deepEqual(record.ingredients_snapshot, [{ name: '鸡胸肉', grams: 120 }]);
  assert.equal(store.getDailyFeedingEnergy(user.id, pet.id).estimated_kcal, 49.5);
});

test('零食自制反馈拒绝缺少实际克数或超过整锅重量的记录', () => {
  store.resetForTests();
  const user = store.createUserForTests({ login: 'snack-amount@example.com', provider: 'email' }).user;
  const pet = store.createPet(user.id, { name: 'xixi', species: 'dog' });
  const operation = store.createCookingOperation(user.id, {
    session_id: 'snack-amount-session', pet_id: pet.id, total_weight_g: 50, is_custom_snack: true,
    estimated_energy: { kcalPerGram: 1 },
  }, { petOwnershipVerified: true });

  assert.throws(() => store.createFeedingRecord(user.id, {
    pet_id: pet.id, cooking_operation_id: operation.id,
  }, { petOwnershipVerified: true }), /Actual feeding grams/);
  assert.throws(() => store.createFeedingRecord(user.id, {
    pet_id: pet.id, cooking_operation_id: operation.id, amount_g: 51,
  }, { petOwnershipVerified: true }), /cannot exceed/);
});
