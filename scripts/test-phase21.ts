import assert from 'node:assert/strict';
import { calculateDiscount } from '@/services/coupon.service';
import { calculateEffectiveDiscount } from '@/services/loyalty.service';
import { isMembershipActive } from '@/services/membership.service';
import { CouponType } from '@/models/Coupon';
import { MembershipStatus } from '@/models/Membership';
import CouponUsage from '@/models/CouponUsage';
import Favorite from '@/models/Favorite';
import CustomerAddress from '@/models/CustomerAddress';
import SupportTicket from '@/models/SupportTicket';

const coupon = { discountType: CouponType.PERCENTAGE, discountValue: 20, maximumDiscount: 5000 } as never;
assert.equal(calculateDiscount(coupon, 10000), 2000);
assert.equal(calculateDiscount({ discountType: CouponType.FIXED, discountValue: 20000, maximumDiscount: 5000 } as never, 10000), 10000);
assert.equal(calculateEffectiveDiscount(10000, 2500, 1500), 2500);
assert.equal(isMembershipActive(new Date(Date.now() + 60_000), MembershipStatus.ACTIVE), true);
assert.equal(isMembershipActive(new Date(Date.now() - 60_000), MembershipStatus.ACTIVE), false);
assert.equal(isMembershipActive(new Date(Date.now() + 60_000), MembershipStatus.EXPIRED), false);

for (const model of [CouponUsage, Favorite, CustomerAddress, SupportTicket]) {
  assert.ok(model.schema.indexes().length > 0, `${model.modelName} should have ownership indexes`);
}
const favoriteUnique = Favorite.schema.indexes().some(([fields, options]) => options?.unique && Object.keys(fields).includes('customer'));
const couponUnique = CouponUsage.schema.indexes().some(([fields, options]) => options?.unique && Object.keys(fields).includes('coupon'));
assert.equal(favoriteUnique, true);
assert.equal(couponUnique, true);
console.log('Phase 21 critical tests passed');
