import assert from 'node:assert/strict';
import { assertIsolatedTestDatabase } from './assert-isolated-test-db';

const validEnv = {
  BOOKMYNAI_TEST_DB: 'bookmynai_dev',
  MONGODB_URI: 'mongodb+srv://synthetic:synthetic@abhikesh.j2trfup.mongodb.net/bookmynai_dev',
};

assert.doesNotThrow(() => assertIsolatedTestDatabase(validEnv));
assert.throws(
  () =>
    assertIsolatedTestDatabase({
      ...validEnv,
      MONGODB_URI: 'mongodb+srv://synthetic:synthetic@abhikesh.j2trfup.mongodb.net/abhikesh_db',
    }),
  /abhikesh_db/,
);
assert.throws(
  () =>
    assertIsolatedTestDatabase({
      ...validEnv,
      MONGODB_URI: 'mongodb+srv://synthetic:synthetic@other.example.net/bookmynai_dev',
    }),
  /approved development cluster/,
);
assert.throws(
  () =>
    assertIsolatedTestDatabase({
      ...validEnv,
      MONGODB_URI: 'mongodb://localhost:27017/bookmynai_dev',
    }),
  /approved development cluster/,
);
assert.throws(
  () =>
    assertIsolatedTestDatabase({
      ...validEnv,
      MONGODB_URI: 'mongodb+srv://synthetic:synthetic@abhikesh.j2trfup.mongodb.net/other_db',
    }),
  /approved development cluster/,
);
assert.throws(
  () =>
    assertIsolatedTestDatabase({
      ...validEnv,
      MONGODB_URI: 'not-a-uri',
    }),
  /invalid/,
);
assert.throws(
  () => assertIsolatedTestDatabase({}),
  /BOOKMYNAI_TEST_DB/,
);
assert.throws(
  () =>
    assertIsolatedTestDatabase({
      ...validEnv,
      BOOKMYNAI_TEST_DB: 'abhikesh_db',
    }),
  /BOOKMYNAI_TEST_DB/,
);
assert.throws(
  () =>
    assertIsolatedTestDatabase({
      ...validEnv,
      MONGODB_URI: 'mongodb+srv://synthetic:synthetic@abhikesh.j2trfup.mongodb.net/bookmynai_dev%2F..%2Fabhikesh_db',
    }),
  /approved development cluster/,
);

assertIsolatedTestDatabase();
console.log('Isolated database safety checks passed.');
