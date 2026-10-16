import assert from 'node:assert/strict';
import {
  getSupportedSalonLocationFilter,
  isSupportedSalonLocation,
  normalizeSupportedSalonLocation,
  SUPPORTED_LAUNCH_CITIES,
} from '../src/constants/launch-cities';
import { isSalonApproved } from '../src/utils/salon-approval';

assert.equal(SUPPORTED_LAUNCH_CITIES.length, 15);

for (const location of SUPPORTED_LAUNCH_CITIES) {
  assert.equal(isSupportedSalonLocation(location.city, location.state), true);
  assert.deepEqual(
    normalizeSupportedSalonLocation(`  ${location.city.toUpperCase()} `, ` ${location.state.toLowerCase()} `),
    location
  );
  assert.ok(getSupportedSalonLocationFilter(location.city, location.state));
}

assert.equal(isSupportedSalonLocation('Indore', 'Madhya Pradesh'), false);
assert.equal(isSupportedSalonLocation('Pune', 'Gujarat'), false);
assert.equal(isSupportedSalonLocation('Unlisted city', 'Haryana'), false);
assert.equal(normalizeSupportedSalonLocation('', 'Delhi'), undefined);
assert.equal(getSupportedSalonLocationFilter('Pune', 'Gujarat'), null);
assert.equal(getSupportedSalonLocationFilter('Indore', 'Madhya Pradesh'), null);
assert.equal(isSalonApproved({ approvalStatus: 'APPROVED', isVerified: true }), true);
assert.equal(isSalonApproved({ approvalStatus: undefined, isVerified: true }), true);
assert.equal(isSalonApproved({ approvalStatus: 'PENDING', isVerified: true }), false);
assert.equal(isSalonApproved({ approvalStatus: 'REJECTED', isVerified: true }), false);
assert.equal(isSalonApproved({ approvalStatus: undefined, isVerified: false }), false);

const stateOnlyFilter = getSupportedSalonLocationFilter(undefined, 'Haryana');
assert.equal(stateOnlyFilter?.$or.length, 2);
assert.deepEqual(
  stateOnlyFilter?.$or.map((pair) => pair['address.city'].source),
  ['^\\s*Gurugram\\s*$', '^\\s*Faridabad\\s*$']
);

console.log('Launch city configuration tests passed');
