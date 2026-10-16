import mongoose, { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Salon from '@/models/Salon';
import Service from '@/models/Service';
import AuditLog from '@/models/AuditLog';
import Barber from '@/models/Barber';
import Booking from '@/models/Booking';
import Review, { type IReview } from '@/models/Review';
import Coupon from '@/models/Coupon';
import { MembershipPlan, CustomerMembership } from '@/models/Membership';
import { BOOKING_STATUS, PAYMENT_STATUS } from '@/constants/booking';
import { USER_ROLES } from '@/constants/roles';
import { REVIEW_STATUS } from '@/constants/reviews';
import type { AuthUser } from '@/types';
import { recordAuditEvent } from '@/services/audit.service';
import { normalizeSupportedSalonLocation, UNSUPPORTED_CITY_MESSAGE } from '@/constants/launch-cities';
import { APPROVED_SALON_STATUS_FILTER, isSalonApproved } from '@/utils/salon-approval';
import { refreshReviewRatingSummary } from '@/services/review-rating-summary.service';

export class AdminInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminInputError';
  }
}

export async function getAdminDashboardStats() {
  await connectDB();

  const [
    totalCustomers,
    totalSalons,
    totalBarbers,
    totalBookings,
    completedBookings,
    cancelledBookings,
    pendingSalonApprovals,
    pendingBarberApprovals,
    pendingReviews,
    activeMemberships,
    couponUsage,
  ] = await Promise.all([
    User.countDocuments({ role: USER_ROLES.CUSTOMER }),
    Salon.countDocuments(),
    Barber.countDocuments(),
    Booking.countDocuments(),
    Booking.countDocuments({ status: BOOKING_STATUS.COMPLETED }),
    Booking.countDocuments({ status: BOOKING_STATUS.CANCELLED }),
    Salon.countDocuments({
      $or: [
        { approvalStatus: 'PENDING' },
        { approvalStatus: { $exists: false }, isVerified: false, isActive: true },
      ],
    }),
    Barber.countDocuments({ isVerified: false, isActive: true }),
    Review.countDocuments({ status: 'PENDING' }),
    CustomerMembership.countDocuments({ status: 'ACTIVE' }),
    Coupon.aggregate([{ $group: { _id: null, used: { $sum: '$usedCount' } } }]),
  ]);

  const revenueResult = await Booking.aggregate([
    { $match: { paymentStatus: PAYMENT_STATUS.PAID } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);

  return {
    totalCustomers,
    totalSalons,
    totalBarbers,
    totalBookings,
    completedBookings,
    cancelledBookings,
    totalRevenue: revenueResult[0]?.total ?? 0,
    pendingSalonApprovals,
    pendingBarberApprovals,
    pendingReviews,
    activeMemberships,
    couponUsage: couponUsage[0]?.used ?? 0,
    recentBookings: await Booking.find()
      .select('status customer salon service')
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customer', 'name')
      .populate('salon', 'name')
      .populate('service', 'name'),
    recentUsers: await User.find().select('name role isActive').sort({ createdAt: -1 }).limit(5),
  };
}

export async function listUsers(options: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: string;
}) {
  await connectDB();

  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(Math.max(1, options.limit ?? 10), 50);
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (options.role) query.role = options.role;
  if (options.isActive !== undefined && options.isActive !== '') query.isActive = options.isActive === 'true';
  if (options.search) {
    query.$or = [
      { name: { $regex: options.search, $options: 'i' } },
      { phone: { $regex: options.search, $options: 'i' } },
      { email: { $regex: options.search, $options: 'i' } },
    ];
  }
  const [users, total] = await Promise.all([
    User.find(query).select('name phone email avatar role isActive isVerified notificationPreferences createdAt updatedAt').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  return { users, total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

export async function listSalonsForAdmin(options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  city?: string;
  from?: Date;
  to?: Date;
}) {
  await connectDB();
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(Math.max(1, options.limit ?? 10), 50);
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (options.status === 'pending') {
    query.$and = [{ $or: [{ approvalStatus: 'PENDING' }, { approvalStatus: { $exists: false }, isVerified: false }] }];
  } else if (options.status === 'active') {
    query.approvalStatus = APPROVED_SALON_STATUS_FILTER;
    query.isVerified = true;
    query.isActive = true;
  } else if (options.status === 'rejected') {
    query.approvalStatus = 'REJECTED';
  } else if (options.status === 'inactive') {
    query.isActive = false;
  }
  if (options.city) query['address.city'] = { $regex: options.city, $options: 'i' };
  if (options.from || options.to) {
    query.createdAt = {
      ...(options.from ? { $gte: options.from } : {}),
      ...(options.to ? { $lte: options.to } : {}),
    };
  }
  if (options.search) {
    query.$or = [
      { name: { $regex: options.search, $options: 'i' } },
      { slug: { $regex: options.search, $options: 'i' } },
      { 'address.city': { $regex: options.search, $options: 'i' } },
      { 'address.area': { $regex: options.search, $options: 'i' } },
    ];
  }
  const queryAnd = Array.isArray(query.$and) ? query.$and : [];
  query.$and = [...queryAnd, { approvalStatus: { $ne: 'DRAFT' } }];

  const [salons, total] = await Promise.all([
    Salon.find(query)
      .populate('owner', 'name phone email role isActive')
      .populate('services', 'name price duration isActive')
      .populate('barbers', 'name slug profileImage experienceYears isVerified isActive')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    Salon.countDocuments(query),
  ]);

  return { salons, total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

export async function getSalonAdminDetails(salonId: string) {
  await connectDB();
  if (!Types.ObjectId.isValid(salonId)) throw new AdminInputError('Invalid salon id');

  const [salon, history] = await Promise.all([
    Salon.findById(salonId)
      .select('+aadhaarDocument +panDocument')
      .populate('owner', 'name phone email role isActive')
      .populate('approvalUpdatedBy', 'name role'),
    AuditLog.find({ entityType: 'Salon', entityId: new Types.ObjectId(salonId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('actorId', 'name role'),
  ]);

  if (!salon) throw new Error('SALON_NOT_FOUND');
  const [services, barbers] = await Promise.all([
    Service.find({ salon: salon._id })
      .select('name description price duration category isActive displayOrder')
      .sort({ displayOrder: 1, name: 1 })
      .maxTimeMS(5000)
      .lean(),
    Barber.find({ salon: salon._id })
      .select('name title slug profileImage bio experienceYears specializations isVerified isActive')
      .populate('user', 'name phone')
      .sort({ name: 1 })
      .maxTimeMS(5000)
      .lean(),
  ]);

  const salonData = salon.toObject();
  const { aadhaarDocument, panDocument, ...safeSalon } = salonData;
  return {
    salon: {
      ...safeSalon,
      identityDocuments: { aadhaar: Boolean(aadhaarDocument), pan: Boolean(panDocument) },
      services,
      barbers,
    },
    history,
  };
}

export async function listBarbersForAdmin(options: { page?: number; limit?: number; search?: string; status?: string }) {
  await connectDB();
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(Math.max(1, options.limit ?? 10), 50);
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (options.status === 'pending') query.isVerified = false;
  if (options.status === 'active') query.isActive = true;
  if (options.search) {
    query.$or = [
      { name: { $regex: options.search, $options: 'i' } },
      { slug: { $regex: options.search, $options: 'i' } },
    ];
  }

  const [barbers, total] = await Promise.all([
    Barber.find(query).populate('user', 'name phone role isActive').populate('salon', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Barber.countDocuments(query),
  ]);

  return { barbers, total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

export async function listReviewsForAdmin(options: { page?: number; limit?: number; status?: string; search?: string }) {
  await connectDB();
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(Math.max(1, options.limit ?? 10), 50);
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (options.status) query.status = options.status;
  if (options.search) {
    query.$or = [
      { review: { $regex: options.search, $options: 'i' } },
      { target: { $regex: options.search, $options: 'i' } },
    ];
  }

  const [reviews, total] = await Promise.all([
    Review.find(query).populate('customer', 'name phone').populate('salon', 'name').populate('barber', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(query),
  ]);

  return { reviews, total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

export async function listCouponsForAdmin(options: { page?: number; limit?: number; search?: string }) {
  await connectDB();
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(Math.max(1, options.limit ?? 10), 50);
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (options.search) {
    query.$or = [
      { code: { $regex: options.search, $options: 'i' } },
      { description: { $regex: options.search, $options: 'i' } },
    ];
  }

  const [coupons, total] = await Promise.all([
    Coupon.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Coupon.countDocuments(query),
  ]);

  return { coupons, total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

export async function listMembershipPlansForAdmin(options: { page?: number; limit?: number; search?: string }) {
  await connectDB();
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(Math.max(1, options.limit ?? 10), 50);
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (options.search) {
    query.$or = [
      { name: { $regex: options.search, $options: 'i' } },
      { description: { $regex: options.search, $options: 'i' } },
    ];
  }

  const [plans, total] = await Promise.all([
    MembershipPlan.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    MembershipPlan.countDocuments(query),
  ]);

  return { plans, total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

export async function getAdminAnalytics(rangeDays = 30) {
  await connectDB();
  const startDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

  const bookingsOverTime = await Booking.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        revenue: { $sum: '$totalAmount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const newCustomers = await User.aggregate([
    { $match: { role: USER_ROLES.CUSTOMER, createdAt: { $gte: startDate } } },
    { $count: 'count' },
  ]);

  const newSalons = await Salon.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    { $count: 'count' },
  ]);

  const newBarbers = await Barber.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    { $count: 'count' },
  ]);

  const completedVsCancelled = await Booking.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  return {
    rangeDays,
    bookingsOverTime,
    newCustomers: newCustomers[0]?.count ?? 0,
    newSalons: newSalons[0]?.count ?? 0,
    newBarbers: newBarbers[0]?.count ?? 0,
    completedVsCancelled,
  };
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  await connectDB();
  if (!Types.ObjectId.isValid(userId)) throw new AdminInputError('Invalid user id');
  const user = await User.findById(userId);
  if (!user) throw new Error('USER_NOT_FOUND');
  user.isActive = isActive;
  await user.save();
  return user;
}

export async function updateUserStatusAsAdmin(actor: AuthUser, userId: string, isActive: boolean) {
  if (actor._id === userId) throw new AdminInputError('You cannot deactivate your own account');
  const user = await updateUserStatus(userId, isActive);
  await recordAuditEvent({ actor, action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', entityType: 'User', entityId: userId });
  return user;
}

export async function updateSalonStatusAsAdmin(actor: AuthUser, salonId: string, isActive: boolean) {
  await connectDB();
  if (!Types.ObjectId.isValid(salonId)) throw new AdminInputError('Invalid salon id');

  const salon = await Salon.findById(salonId);
  if (!salon) throw new Error('SALON_NOT_FOUND');
  if (salon.approvalStatus === 'DRAFT') throw new AdminInputError('Draft salons cannot be activated or deactivated.');
  if (isActive && (
    !isSalonApproved(salon) ||
    !normalizeSupportedSalonLocation(salon.address?.city ?? '', salon.address?.state ?? '')
  )) {
    throw new AdminInputError('Only an approved, verified salon in a supported location can be activated.');
  }

  const updatedSalon = await Salon.findOneAndUpdate(
    {
      _id: salon._id,
      isActive: salon.isActive,
      isVerified: salon.isVerified,
      approvalStatus: salon.approvalStatus ?? null,
    },
    { $set: { isActive } },
    { new: true, runValidators: true },
  );
  if (!updatedSalon) throw new AdminConflictError('Salon status changed while it was being updated. Reload and try again.');

  await recordAuditEvent({
    actor,
    action: isActive ? 'SALON_ACTIVATED' : 'SALON_DEACTIVATED',
    entityType: 'Salon',
    entityId: salonId,
  });
  return updatedSalon;
}

export async function updateSalonVerification(actor: AuthUser, salonId: string, isVerified: boolean, reason?: string) {
  await connectDB();
  if (!Types.ObjectId.isValid(salonId)) throw new AdminInputError('Invalid salon id');
  if (!isVerified && !reason?.trim()) throw new AdminInputError('A rejection reason is required');
  const salon = await Salon.findById(salonId);
  if (!salon) throw new Error('SALON_NOT_FOUND');
  if (salon.approvalStatus === 'DRAFT') throw new Error('SALON_NOT_SUBMITTED');
  if (isVerified && !normalizeSupportedSalonLocation(salon.address.city, salon.address.state)) {
    throw new Error(`CITY_NOT_SUPPORTED: ${UNSUPPORTED_CITY_MESSAGE}`);
  }
  const approvalUpdatedAt = new Date();
  const updatedSalon = await Salon.findOneAndUpdate(
    {
      _id: salon._id,
      approvalStatus: salon.approvalStatus ?? null,
      isVerified: salon.isVerified,
      isActive: salon.isActive,
      approvalUpdatedAt: salon.approvalUpdatedAt ?? null,
    },
    {
      $set: {
        isVerified,
        isActive: isVerified,
        approvalStatus: isVerified ? 'APPROVED' : 'REJECTED',
        rejectionReason: isVerified ? null : reason!.trim(),
        approvalUpdatedAt,
        approvalUpdatedBy: new Types.ObjectId(actor._id),
      },
    },
    { new: true, runValidators: true },
  );
  if (!updatedSalon) throw new AdminConflictError('Salon approval changed while it was being reviewed. Reload and try again.');
  await recordAuditEvent({ actor, action: isVerified ? 'SALON_APPROVED' : 'SALON_REJECTED', entityType: 'Salon', entityId: salonId, metadata: reason ? { reason } : undefined });
  return updatedSalon;
}

export class AdminConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminConflictError';
  }
}

export async function updateBarberVerification(actor: AuthUser, barberId: string, isVerified: boolean, reason?: string) {
  await connectDB();
  if (!Types.ObjectId.isValid(barberId)) throw new AdminInputError('Invalid barber id');
  const barber = await Barber.findById(barberId);
  if (!barber) throw new Error('BARBER_NOT_FOUND');
  barber.isVerified = isVerified;
  barber.isActive = isVerified && Boolean(barber.user);
  await barber.save();
  await recordAuditEvent({ actor, action: isVerified ? 'BARBER_APPROVED' : 'BARBER_REJECTED', entityType: 'Barber', entityId: barberId, metadata: reason ? { reason } : undefined });
  return barber;
}

export async function moderateReviewAsAdmin(actor: AuthUser, reviewId: string, status: string, reason?: string) {
  await connectDB();
  if (!Types.ObjectId.isValid(reviewId)) throw new AdminInputError('Invalid review id');
  if (!Object.values(REVIEW_STATUS).includes(status as (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS])) throw new AdminInputError('Invalid review status');
  const session = await mongoose.startSession();
  let updatedReview: IReview | null = null;
  try {
    await session.withTransaction(async () => {
      const review = await Review.findById(reviewId).session(session);
      if (!review) throw new Error('REVIEW_NOT_FOUND');
      review.status = status;
      await review.save({ session });
      await refreshReviewRatingSummary(review, session);
      updatedReview = review;
    });
  } finally {
    await session.endSession();
  }
  if (!updatedReview) throw new Error('REVIEW_NOT_FOUND');
  await recordAuditEvent({ actor, action: `REVIEW_${status}`, entityType: 'Review', entityId: reviewId, metadata: reason ? { reason } : undefined });
  return updatedReview;
}

export async function createCouponAdmin(actor: AuthUser, input: Record<string, unknown>) {
  await connectDB();
  const code = String(input.code ?? '').trim().toUpperCase();
  const discountValue = Number(input.discountValue);
  const expiryDate = new Date(String(input.expiryDate ?? ''));
  if (!/^[A-Z0-9_-]{3,50}$/.test(code)) throw new AdminInputError('Invalid coupon code');
  if (!Number.isFinite(discountValue) || discountValue <= 0) throw new AdminInputError('Invalid discount value');
  if (input.discountType === 'PERCENTAGE' && discountValue > 100) throw new AdminInputError('Percentage discount cannot exceed 100');
  if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) throw new AdminInputError('Invalid expiry date');
  const coupon = await Coupon.create({
    code,
    description: input.description ?? '',
    discountType: input.discountType ?? 'PERCENTAGE',
    discountValue,
    minimumOrderValue: Number(input.minimumOrderValue ?? 0),
    maximumDiscount: input.maximumDiscount ? Number(input.maximumDiscount) : undefined,
    startDate: new Date(String(input.startDate ?? Date.now())),
    expiryDate,
    usageLimit: input.usageLimit ? Number(input.usageLimit) : undefined,
    perUserLimit: input.perUserLimit ? Number(input.perUserLimit) : undefined,
    active: input.active !== false,
    applicable: {
      salons: Array.isArray(input.applicableSalons) ? input.applicableSalons.map((id) => new Types.ObjectId(String(id))) : [],
      services: Array.isArray(input.applicableServices) ? input.applicableServices.map((id) => new Types.ObjectId(String(id))) : [],
      customers: Array.isArray(input.applicableCustomers) ? input.applicableCustomers.map((id) => new Types.ObjectId(String(id))) : [],
    },
  });
  await recordAuditEvent({ actor, action: 'COUPON_CREATED', entityType: 'Coupon', entityId: coupon._id.toString(), metadata: { code: coupon.code } });
  return coupon;
}

export async function createMembershipPlanAdmin(actor: AuthUser, input: Record<string, unknown>) {
  await connectDB();
  const name = String(input.name ?? '').trim();
  const price = Number(input.price);
  const duration = Number(input.duration);
  const discountPercentage = Number(input.discountPercentage ?? 0);
  if (name.length < 3 || name.length > 100) throw new AdminInputError('Invalid membership name');
  if (!Number.isFinite(price) || price < 1 || ![1, 3, 6, 12].includes(duration)) throw new AdminInputError('Invalid membership plan');
  if (!Number.isFinite(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) throw new AdminInputError('Invalid membership discount');
  const plan = await MembershipPlan.create({
    name,
    description: input.description ?? '',
    price,
    duration,
    benefits: Array.isArray(input.benefits) ? input.benefits.map((item) => String(item)) : [],
    discountPercentage,
    bonusPointsMultiplier: Number(input.bonusPointsMultiplier ?? 1),
    active: input.active !== false,
  });
  await recordAuditEvent({ actor, action: 'MEMBERSHIP_PLAN_CREATED', entityType: 'MembershipPlan', entityId: plan._id.toString() });
  return plan;
}
