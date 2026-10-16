import assert from 'node:assert/strict';
import { FavoriteIdSchema, FavoriteInputSchema } from '../src/validations/favorite.schema';
import Favorite from '../src/models/Favorite';

assert.deepEqual(
  FavoriteInputSchema.parse({
    targetType: 'SALON',
    targetId: '64b000000000000000000000',
  }),
  {
    targetType: 'SALON',
    targetId: '64b000000000000000000000',
  },
);
assert.equal(
  FavoriteInputSchema.safeParse({
    targetType: 'BARBER',
    targetId: '64b000000000000000000000',
  }).success,
  true,
);
assert.equal(FavoriteInputSchema.safeParse({ targetType: 'ADMIN', targetId: '64b000000000000000000000' }).success, false);
assert.equal(FavoriteInputSchema.safeParse({ targetType: 'SALON', targetId: 'not-an-id' }).success, false);
assert.equal(FavoriteInputSchema.safeParse({ targetType: 'SALON', targetId: '64b000000000000000000000', extra: true }).success, false);
assert.equal(FavoriteInputSchema.safeParse({ targetType: 'SALON', targetId: '64b000000000000000000000', customer: 'another-customer' }).success, false);
assert.equal(FavoriteIdSchema.safeParse('64b000000000000000000000').success, true);
assert.equal(FavoriteIdSchema.safeParse('invalid').success, false);
assert(
  Favorite.schema.indexes().some(([keys, options]) =>
    options.unique === true &&
    keys.customer === 1 &&
    keys.targetType === 1 &&
    keys.target === 1,
  ),
  'Favorite uniqueness must be enforced per customer, target type, and target',
);

console.log('Favorite validation tests passed.');
