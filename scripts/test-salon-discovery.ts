import assert from 'node:assert/strict';
import {
  getSingleQueryParam,
  NearbySalonQuerySchema,
  SalonDiscoveryQuerySchema,
  SalonDetailParamSchema,
} from '../src/validations/salon-discovery.schema';
import { buildActiveServiceSearchFilter } from '../src/utils/service-search';
import { isValidCoordinates, parseCoordinates } from '../src/utils/distance';
import { LocationSchema } from '../src/validations/salon.schema';

assert.deepEqual(
  SalonDiscoveryQuerySchema.parse({}),
  { page: 1, limit: 20, sortBy: 'newest' },
);
assert.deepEqual(
  SalonDiscoveryQuerySchema.parse({
    page: '2',
    limit: '50',
    city: ' Delhi ',
    area: 'South Delhi',
    search: 'hair studio',
    serviceSearch: 'beard trim',
    category: 'BEARD',
    sortBy: 'rating',
  }),
  {
    page: 2,
    limit: 50,
    city: 'Delhi',
    area: 'South Delhi',
    search: 'hair studio',
    serviceSearch: 'beard trim',
    category: 'BEARD',
    sortBy: 'rating',
  },
);
assert.equal(SalonDiscoveryQuerySchema.safeParse({ page: '2abc' }).success, false);
assert.equal(SalonDiscoveryQuerySchema.safeParse({ page: '1001' }).success, false);
assert.equal(SalonDiscoveryQuerySchema.safeParse({ limit: '51' }).success, false);
assert.equal(SalonDiscoveryQuerySchema.safeParse({ sortBy: 'owner.phone' }).success, false);
assert.equal(SalonDiscoveryQuerySchema.safeParse({ search: 'x'.repeat(101) }).success, false);
assert.equal(SalonDiscoveryQuerySchema.safeParse({ serviceSearch: 'x'.repeat(81) }).success, false);
assert.equal(SalonDiscoveryQuerySchema.safeParse({ category: 'NOT_A_CATEGORY' }).success, false);
assert.equal(SalonDiscoveryQuerySchema.safeParse({ slug: 'some/other/path' }).success, false);
assert.equal(SalonDetailParamSchema.safeParse('sample-salon-1').success, true);
assert.equal(SalonDetailParamSchema.safeParse('64b000000000000000000000').success, true);
assert.equal(SalonDetailParamSchema.safeParse('some/other/path').success, false);
assert.equal(SalonDetailParamSchema.safeParse('x'.repeat(121)).success, false);

assert.deepEqual(
  NearbySalonQuerySchema.parse({
    latitude: '28.6',
    longitude: '77.2',
    radius: '5',
    city: 'Delhi',
    area: 'South Delhi',
    search: 'studio',
    serviceSearch: 'hair colour',
    category: 'HAIR_COLOR',
  }),
  {
    latitude: 28.6,
    longitude: 77.2,
    radius: 5,
    page: 1,
    limit: 20,
    city: 'Delhi',
    area: 'South Delhi',
    search: 'studio',
    serviceSearch: 'hair colour',
    category: 'HAIR_COLOR',
  },
);
assert.equal(
  NearbySalonQuerySchema.safeParse({
    latitude: '28',
    longitude: '77',
    radius: '5',
    search: 'x'.repeat(101),
  }).success,
  false,
);
assert.equal(NearbySalonQuerySchema.safeParse({ latitude: '91', longitude: '77', radius: '5' }).success, false);
assert.equal(NearbySalonQuerySchema.safeParse({ latitude: '-90', longitude: '180', radius: '1' }).success, true);
assert.equal(NearbySalonQuerySchema.safeParse({ latitude: '28', radius: '5' }).success, false);
assert.equal(NearbySalonQuerySchema.safeParse({ longitude: '77', radius: '5' }).success, false);
assert.equal(NearbySalonQuerySchema.safeParse({ latitude: 'NaN', longitude: '77', radius: '5' }).success, false);
assert.equal(NearbySalonQuerySchema.safeParse({ latitude: '28', longitude: '77', radius: '0' }).success, false);
assert.equal(NearbySalonQuerySchema.safeParse({ latitude: '28', longitude: '77', radius: '101' }).success, false);
assert.equal(NearbySalonQuerySchema.safeParse({ latitude: '28', longitude: '181', radius: '5' }).success, false);
assert.equal(NearbySalonQuerySchema.safeParse({ latitude: '28x', longitude: '77', radius: '5' }).success, false);
assert.equal(
  NearbySalonQuerySchema.safeParse({
    latitude: '28',
    longitude: '77',
    radius: '5',
    serviceId: 'not-an-object-id',
  }).success,
  false,
);

const repeated = new URLSearchParams('city=Delhi&city=Mumbai');
assert.throws(() => getSingleQueryParam(repeated, 'city'), /Duplicate query parameter/);
assert.equal(getSingleQueryParam(new URLSearchParams('city=Delhi'), 'city'), 'Delhi');

const serviceFilter = buildActiveServiceSearchFilter({
  serviceSearch: 'hair.*',
  category: 'HAIR_COLOR',
});
assert.equal(serviceFilter.isActive, true);
assert.equal(serviceFilter.category, 'HAIR_COLOR');
const serviceNameRegex = (serviceFilter.$or as Array<{ name?: RegExp }>)[0].name;
assert(serviceNameRegex instanceof RegExp);
assert.equal(serviceNameRegex.test('Hair.* colouring'), true);
assert.equal(serviceNameRegex.test('Hair colouring'), false);
assert.deepEqual(
  buildActiveServiceSearchFilter({ serviceId: '64b000000000000000000000' }),
  { isActive: true, _id: '64b000000000000000000000' },
);
assert.deepEqual(parseCoordinates('28.7, 77.1'), { lat: 28.7, lng: 77.1 });
assert.equal(parseCoordinates('28.7x, 77.1'), null);
assert.equal(parseCoordinates('0x10, 77.1'), null);
assert.equal(parseCoordinates(',77.1'), null);
assert.equal(parseCoordinates('91, 77.1'), null);
assert.equal(isValidCoordinates(Number.NaN, 77.1), false);
assert.equal(LocationSchema.safeParse({ type: 'Point', coordinates: [180, 90] }).success, true);
assert.equal(LocationSchema.safeParse({ type: 'Point', coordinates: [181, 90] }).success, false);
assert.equal(LocationSchema.safeParse({ type: 'Point', coordinates: [77, -91] }).success, false);

console.log('Salon discovery query validation tests passed.');
