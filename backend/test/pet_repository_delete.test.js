const test = require('node:test');
const assert = require('node:assert/strict');

test('pet deletion removes related records in one transaction', async () => {
  const pgClientPath = require.resolve('../src/data/pg_client');
  const repositoryPath = require.resolve('../src/services/pet_repository');
  const pgClient = require(pgClientPath);
  const originalGetPool = pgClient.getPool;
  const statements = [];
  const client = {
    async query(text, params) {
      statements.push({ text, params });
      if (String(text).includes('SELECT id FROM pets')) return { rows: [{ id: 'pet_1' }] };
      return { rows: [] };
    },
    release() {},
  };

  try {
    pgClient.getPool = () => ({ connect: async () => client });
    delete require.cache[repositoryPath];
    const { deletePetForUser } = require(repositoryPath);

    assert.equal(await deletePetForUser('user_1', 'pet_1'), true);
    assert.equal(statements[0].text, 'BEGIN');
    assert.ok(!statements[1].text.includes('deleted_at IS NULL'));
    assert.ok(statements.some(({ text }) => text.includes('DELETE FROM feeding_records')));
    assert.ok(statements.some(({ text }) => text.includes('DELETE FROM health_records')));
    assert.ok(statements.some(({ text }) => text.includes('DELETE FROM medical_records')));
    assert.ok(statements.some(({ text }) => text.includes('DELETE FROM device_pet_bindings')));
    assert.ok(statements.some(({ text }) => text.includes('UPDATE cooking_operations SET pet_id = NULL')));
    assert.ok(statements.some(({ text }) => text.includes('UPDATE orders SET pet_id = NULL')));
    assert.equal(statements.at(-1).text, 'COMMIT');
  } finally {
    pgClient.getPool = originalGetPool;
    delete require.cache[repositoryPath];
  }
});
