/**
 * Salon Service Layer
 * Business logic for salon operations
 */

import { connectDB } from '@/lib/db';
import { Types } from 'mongoose';
import Salon from '@/models/Salon';
import Barber from '@/models/Barber';
import Service from '@/models/Service';
import User from '@/models/User';
import { generateUniqueSlug } from '@/utils/slug';
import { normalizePhoneNumber } from '@/utils/phone';
import { USER_ROLES } from '@/constants/roles';
import type { SalonType } from '@/constants/services';
import type { AuthUser } from '@/types';
import type { SalonCreateInput, SalonUpdateInput } from '@/validations/salon.schema';
import type { ISalon } from '@/models/Salon';
import { recordAuditEvent } from '@/services/audit.service';
import {
  getSupportedSalonLocationFilter,
  normalizeSupportedSalonLocation,
  UNSUPPORTED_CITY_MESSAGE,
} from '@/constants/launch-cities';
import { APPROVED_SALON_STATUS_FILTER, isSalonApproved } from '@/utils/salon-approval';
import { buildActiveServiceSearchFilter } from '@/utils/service-search';
import { canManageSalon } from '@/utils/salon-authorization';
import { FEATURE22_DEMO_KEY_PREFIX } from '@/lib/feature22-demo-data';
import { getSalonApplicationBlockers } from '@/utils/salon-application-readiness';

export interface SalonWithOwner extends Omit<ISalon, 'owner'> {
  owner: AuthUser;
}

export interface PublicSalonDetails {
  _id: string;
  name: string;
  slug: string;
  salonType?: ISalon['salonType'];
  description?: string;
  logo?: string;
  coverImage?: string;
  images: string[];
  address: Partial<ISalon['address']>;
  location?: ISalon['location'];
  openingHours: Partial<ISalon['openingHours']>;
  facilities: ISalon['facilities'];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isDemoPreview: boolean;
  services: Array<{
    _id: string;
    name: string;
    description?: string;
    category: string;
    duration: number;
    price: number;
    discountPrice?: number;
    image?: string;
  }>;
  barbers: Array<{
    _id: string;
    name: string;
    title?: string;
    slug: string;
    profileImage?: string;
    bio?: string;
    experienceYears: number;
    specializations: string[];
    rating: number;
    reviewCount: number;
    services: Array<{ _id: string; name: string; duration: number; price: number }>;
  }>;
}

interface PublicSalonRecord {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  salonType?: ISalon['salonType'] | null;
  description?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  images?: string[];
  address?: Partial<ISalon['address']>;
  location?: ISalon['location'];
  openingHours?: Partial<ISalon['openingHours']>;
  facilities?: ISalon['facilities'];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  demoKey?: string;
}

interface PublicServiceRecord {
  _id: Types.ObjectId;
  name: string;
  description?: string | null;
  category: string;
  duration: number;
  price: number;
  discountPrice?: number | null;
  image?: string | null;
}

interface PublicBarberRecord {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  title?: string | null;
  slug: string;
  profileImage?: string | null;
  bio?: string | null;
  experienceYears: number;
  specializations: string[];
  services?: Types.ObjectId[];
  rating: number;
  reviewCount: number;
  demoKey?: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a new salon
 * Only SALON_OWNER, ADMIN, SUPER_ADMIN can create
 */
export async function createSalon(
  input: SalonCreateInput,
  currentUser: AuthUser
): Promise<ISalon> {
  const supportedLocation = normalizeSupportedSalonLocation(input.address.city, input.address.state);
  if (!supportedLocation) throw new Error(`CITY_NOT_SUPPORTED: ${UNSUPPORTED_CITY_MESSAGE}`);
  await connectDB();

  // Verify user role can create salon
  if (
    currentUser.role !== USER_ROLES.SALON_OWNER &&
    currentUser.role !== USER_ROLES.ADMIN &&
    currentUser.role !== USER_ROLES.SUPER_ADMIN
  ) {
    throw new Error('SALON_ACCESS_DENIED: Your role cannot create salons');
  }

  // Verify user is active
  const user = await User.findById(currentUser._id);
  if (!user || !user.isActive) {
    throw new Error('USER_INACTIVE: Your account is inactive');
  }

  // For SALON_OWNER, always set themselves as owner
  const ownerId = currentUser.role === USER_ROLES.SALON_OWNER ? currentUser._id : currentUser._id;

  // Verify owner exists and has correct role
  const ownerUser = await User.findById(ownerId);
  if (!ownerUser) {
    throw new Error('OWNER_NOT_FOUND: Owner user not found');
  }
  if (
    ownerUser.role !== USER_ROLES.SALON_OWNER &&
    ownerUser.role !== USER_ROLES.ADMIN &&
    ownerUser.role !== USER_ROLES.SUPER_ADMIN
  ) {
    throw new Error('INVALID_OWNER_ROLE: Owner must have SALON_OWNER, ADMIN, or SUPER_ADMIN role');
  }

  if (
    currentUser.role === USER_ROLES.SALON_OWNER &&
    await Salon.exists({ owner: currentUser._id })
  ) {
    throw new Error('SALON_ALREADY_EXISTS');
  }

  // Generate unique slug
  const slug = await generateUniqueSlug(input.name);

  // Normalize phone number
  const normalizedPhone = normalizePhoneNumber(input.contact.phone);

  // Create salon
  const salon = await Salon.create({
    name: input.name,
    slug,
    salonType: input.salonType,
    description: input.description || '',
    logo: input.logo || null,
    coverImage: input.coverImage || null,
    images: input.images || [],
    owner: ownerId,
    address: { ...input.address, city: supportedLocation.city, state: supportedLocation.state },
    location: input.location,
    contact: {
      phone: normalizedPhone,
      email: input.contact.email || null,
      website: input.contact.website || null,
    },
    socialLinks: {
      instagram: input.socialLinks?.instagram || null,
      facebook: input.socialLinks?.facebook || null,
      youtube: input.socialLinks?.youtube || null,
    },
    openingHours: input.openingHours,
    facilities: input.facilities || [],
    isActive: false,
    isVerified: false,
    approvalStatus: 'DRAFT',
  });

  return salon;
}

export async function submitSalonApplication(currentUser: AuthUser): Promise<ISalon> {
  await connectDB();
  if (currentUser.role !== USER_ROLES.SALON_OWNER) {
    throw new Error('SALON_ACCESS_DENIED: Salon owner access required');
  }

  const salon = await Salon.findOne({ owner: currentUser._id }).select('+aadhaarDocument +panDocument');
  if (!salon) throw new Error('SALON_NOT_FOUND');
  if (salon.approvalStatus !== 'DRAFT') {
    throw new Error('SALON_APPLICATION_CONFLICT: This application is no longer a draft. Reload its current status.');
  }

  const [activeServiceCount, barberProfileCount] = await Promise.all([
    Service.countDocuments({ salon: salon._id, isActive: true }),
    Barber.countDocuments({ salon: salon._id }),
  ]);
  const blockers = getSalonApplicationBlockers({
    activeServiceCount,
    barberProfileCount,
    hasAadhaarDocument: Boolean(salon.aadhaarDocument),
    hasPanDocument: Boolean(salon.panDocument),
  });
  if (blockers.length) throw new Error(`SALON_APPLICATION_INCOMPLETE:${blockers.join('|')}`);

  const submitted = await Salon.findOneAndUpdate(
    { _id: salon._id, owner: currentUser._id, approvalStatus: 'DRAFT' },
    { $set: { approvalStatus: 'PENDING' } },
    { new: true, runValidators: true },
  );
  if (!submitted) {
    throw new Error('SALON_APPLICATION_CONFLICT: This application changed while it was being submitted. Reload and try again.');
  }
  return submitted;
}

/**
 * Get salon by ID
 */
export async function getSalonById(salonId: string): Promise<ISalon | null> {
  await connectDB();
  const salon = await Salon.findOne({
    _id: salonId,
    isActive: true,
    isVerified: true,
    approvalStatus: APPROVED_SALON_STATUS_FILTER,
    ...getSupportedSalonLocationFilter(),
  }).populate('owner', 'name phone email role');
  return salon;
}

/**
 * Get salon by slug (public)
 */
export async function getSalonBySlug(slug: string): Promise<ISalon | null> {
  await connectDB();
  const salon = await Salon.findOne({
    slug,
    isActive: true,
    isVerified: true,
    approvalStatus: APPROVED_SALON_STATUS_FILTER,
    ...getSupportedSalonLocationFilter(),
  }).populate('owner', 'name phone email role');
  return salon;
}

/**
 * Return only public salon, service, and barber fields for a salon detail page.
 */
export async function getPublicSalonDetails(identifier: string): Promise<PublicSalonDetails | null> {
  await connectDB();

  const supportedLocation = getSupportedSalonLocationFilter();
  if (!supportedLocation) return null;

  const isObjectId = /^[a-f\d]{24}$/i.test(identifier);
  const salon: PublicSalonRecord | null = await Salon.findOne({
    ...(isObjectId ? { _id: identifier } : { slug: identifier.toLowerCase() }),
    isActive: true,
    isVerified: true,
    approvalStatus: APPROVED_SALON_STATUS_FILTER,
    ...supportedLocation,
  })
    .select('name slug salonType description logo coverImage images address location openingHours facilities rating reviewCount isVerified +demoKey')
    .maxTimeMS(5000)
    .lean();

  if (!salon) return null;

  const [serviceRecords, barberRecords]: [PublicServiceRecord[], PublicBarberRecord[]] = await Promise.all([
    Service.find({ salon: salon._id, isActive: true })
      .select('name description category duration price discountPrice image displayOrder')
      .sort({ displayOrder: 1, name: 1 })
      .limit(50)
      .maxTimeMS(5000)
      .lean(),
    Barber.find({
      salon: salon._id,
      isActive: true,
      $or: [
        { user: null },
        { user: { $ne: null }, isVerified: true },
      ],
    })
      .select('user name title slug profileImage bio experienceYears specializations services rating reviewCount +demoKey')
      .sort({ name: 1 })
      .limit(50)
      .maxTimeMS(5000)
      .lean(),
  ]);

  const activeUserIds = new Set(
    (await User.find({
      _id: { $in: barberRecords.flatMap((barber) => barber.user ? [barber.user] : []) },
      isActive: true,
      role: USER_ROLES.BARBER,
    })
      .distinct('_id')
      .maxTimeMS(5000))
      .map((id: Types.ObjectId) => id.toString()),
  );

  const services = serviceRecords
    .filter((service) =>
      Number.isFinite(service.duration) &&
      service.duration >= 15 &&
      service.duration <= 480 &&
      Number.isFinite(service.price) &&
      service.price >= 0,
    )
    .map((service) => ({
      _id: service._id.toString(),
      name: service.name,
      description: service.description || undefined,
      category: service.category,
      duration: service.duration,
      price: service.price,
      discountPrice:
        typeof service.discountPrice === 'number' &&
        Number.isFinite(service.discountPrice) &&
        service.discountPrice >= 0 &&
        service.discountPrice <= service.price
          ? service.discountPrice
          : undefined,
      image: service.image || undefined,
    }));
  const servicesById = new Map(services.map((service) => [service._id, service]));

  const barbers = barberRecords
    .flatMap((barber) => !barber.user || activeUserIds.has(barber.user.toString()) ? [barber] : [])
    .map((barber) => ({
      _id: barber._id.toString(),
      name: barber.name,
      title: barber.title || undefined,
      slug: barber.slug,
      profileImage: barber.profileImage || undefined,
      bio: barber.bio || undefined,
      experienceYears: Number.isFinite(barber.experienceYears) && barber.experienceYears >= 0
        ? barber.experienceYears
        : 0,
      specializations: barber.specializations,
      rating: Number.isFinite(barber.rating) && barber.rating >= 0 && barber.rating <= 5
        ? barber.rating
        : 0,
      reviewCount: Number.isFinite(barber.reviewCount) && barber.reviewCount >= 0
        ? barber.reviewCount
        : 0,
      isDemoPreview: barber.demoKey?.startsWith(FEATURE22_DEMO_KEY_PREFIX) ?? false,
      services: (barber.services ?? [])
        .map((serviceId) => servicesById.get(serviceId.toString()))
        .filter((service): service is NonNullable<typeof service> => Boolean(service))
        .map(({ _id, name, duration, price }) => ({ _id, name, duration, price })),
    }));

  return {
    _id: salon._id.toString(),
    name: salon.name,
    slug: salon.slug,
    salonType: salon.salonType || undefined,
    description: salon.description || undefined,
    logo: salon.logo || undefined,
    coverImage: salon.coverImage || undefined,
    images: (salon.images ?? []).filter((image): image is string => typeof image === 'string' && image.length > 0),
    address: salon.address ?? {},
    location: salon.location,
    openingHours: salon.openingHours ?? {},
    facilities: salon.facilities ?? [],
    rating: Number.isFinite(salon.rating) && salon.rating >= 0 && salon.rating <= 5 ? salon.rating : 0,
    reviewCount: Number.isFinite(salon.reviewCount) && salon.reviewCount >= 0 ? salon.reviewCount : 0,
    isVerified: salon.isVerified,
    isDemoPreview: salon.demoKey?.startsWith(FEATURE22_DEMO_KEY_PREFIX) ?? false,
    services,
    barbers,
  };
}

/**
 * Get salon for owner
 * Owner can only view their own salon
 */
export async function getSalonForOwner(salonId: string, currentUser: AuthUser): Promise<ISalon | null> {
  await connectDB();

  const salon = await Salon.findById(salonId);
  if (!salon) {
    return null;
  }

  // Check ownership
  if (!canManageSalon(salon.owner.toString(), currentUser._id, currentUser.role)) {
    throw new Error('SALON_ACCESS_DENIED: You can only view your own salon');
  }

  return salon;
}

/**
 * Update a salon
 */
export async function updateSalon(
  salonId: string,
  input: SalonUpdateInput,
  currentUser: AuthUser
): Promise<ISalon> {
  await connectDB();

  const salon = await Salon.findById(salonId);
  if (!salon) {
    throw new Error('SALON_NOT_FOUND: Salon not found');
  }

  // Check authorization
  const isOwner = currentUser.role === USER_ROLES.SALON_OWNER &&
    salon.owner.toString() === currentUser._id;
  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN;
  if (!isOwner && !isAdmin) {
    throw new Error('SALON_ACCESS_DENIED: You can only edit your own salon');
  }

  const locationChanged = input.address?.city !== undefined || input.address?.state !== undefined;
  const activating = input.isActive === true && isAdmin;
  if (locationChanged || activating) {
    const city = input.address?.city ?? salon.address.city;
    const state = input.address?.state ?? salon.address.state;
    const supportedLocation = normalizeSupportedSalonLocation(city, state);
    if (!supportedLocation) throw new Error(`CITY_NOT_SUPPORTED: ${UNSUPPORTED_CITY_MESSAGE}`);
    if (locationChanged && input.address) {
      input.address.city = supportedLocation.city;
      input.address.state = supportedLocation.state;
    }
  }

  // Update allowed fields
  if (input.name) salon.name = input.name;
  if (input.salonType !== undefined) salon.salonType = input.salonType;
  if (input.description !== undefined) salon.description = input.description || '';
  if (input.logo !== undefined) salon.logo = input.logo || null;
  if (input.coverImage !== undefined) salon.coverImage = input.coverImage || null;
  if (input.images !== undefined) salon.images = input.images;
  if (input.socialLinks) {
    salon.socialLinks = {
      instagram: input.socialLinks.instagram === undefined ? salon.socialLinks?.instagram ?? null : input.socialLinks.instagram || null,
      facebook: input.socialLinks.facebook === undefined ? salon.socialLinks?.facebook ?? null : input.socialLinks.facebook || null,
      youtube: input.socialLinks.youtube === undefined ? salon.socialLinks?.youtube ?? null : input.socialLinks.youtube || null,
    };
  }

  // Address update
  if (input.address) {
    salon.address = { ...salon.address, ...input.address };
  }

  // Location update
  if (input.location) {
    salon.location = input.location;
  }

  // Contact update
  if (input.contact) {
    if (input.contact.phone) {
      salon.contact.phone = normalizePhoneNumber(input.contact.phone);
    }
    if (input.contact.email !== undefined) {
      salon.contact.email = input.contact.email || null;
    }
    if (input.contact.website !== undefined) {
      salon.contact.website = input.contact.website || null;
    }
  }

  // Opening hours update
  if (input.openingHours) {
    salon.openingHours = { ...salon.openingHours, ...input.openingHours };
  }

  // Facilities update
  if (input.facilities) {
    salon.facilities = input.facilities;
  }

  // Only ADMIN/SUPER_ADMIN can change isActive
  if (input.isActive !== undefined && isAdmin) {
    salon.isActive = input.isActive;
  }

  if (isOwner && Object.keys(input).some((key) => key !== 'isActive')) {
    salon.isActive = false;
    salon.isVerified = false;
    salon.approvalStatus = salon.approvalStatus === 'DRAFT' ? 'DRAFT' : 'PENDING';
    salon.rejectionReason = null;
    salon.approvalUpdatedAt = null;
    salon.approvalUpdatedBy = null;
  }

  // Protected fields - cannot be changed
  // - owner
  // - isVerified (only by admin)
  // - slug
  // - _id

  await salon.save();
  return salon;
}

/**
 * Activate a salon
 */
export async function activateSalon(salonId: string, currentUser: AuthUser): Promise<ISalon> {
  await connectDB();

  const salon = await Salon.findById(salonId);
  if (!salon) {
    throw new Error('SALON_NOT_FOUND: Salon not found');
  }

  // Check authorization
  if (!canManageSalon(salon.owner.toString(), currentUser._id, currentUser.role)) {
    throw new Error('SALON_ACCESS_DENIED: You can only manage your own salon');
  }

  if (!normalizeSupportedSalonLocation(salon.address.city, salon.address.state)) {
    throw new Error(`CITY_NOT_SUPPORTED: ${UNSUPPORTED_CITY_MESSAGE}`);
  }
  if (!isSalonApproved(salon)) {
    throw new Error('SALON_NOT_APPROVED');
  }
  salon.isActive = true;
  await salon.save();
  void recordAuditEvent({ actor: currentUser, action: 'SALON_ACTIVATED', entityType: 'Salon', entityId: salonId });
  return salon;
}

/**
 * Deactivate a salon
 */
export async function deactivateSalon(salonId: string, currentUser: AuthUser): Promise<ISalon> {
  await connectDB();

  const salon = await Salon.findById(salonId);
  if (!salon) {
    throw new Error('SALON_NOT_FOUND: Salon not found');
  }

  // Check authorization
  if (!canManageSalon(salon.owner.toString(), currentUser._id, currentUser.role)) {
    throw new Error('SALON_ACCESS_DENIED: You can only manage your own salon');
  }

  salon.isActive = false;
  await salon.save();
  void recordAuditEvent({ actor: currentUser, action: 'SALON_DEACTIVATED', entityType: 'Salon', entityId: salonId });
  return salon;
}

/**
 * Verify a salon (ADMIN/SUPER_ADMIN only)
 */
export async function verifySalon(salonId: string, currentUser: AuthUser): Promise<ISalon> {
  await connectDB();

  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN;
  if (!isAdmin) {
    throw new Error('SALON_VERIFICATION_DENIED: Only admins can verify salons');
  }

  const salon = await Salon.findById(salonId);
  if (!salon) {
    throw new Error('SALON_NOT_FOUND: Salon not found');
  }

  if (!normalizeSupportedSalonLocation(salon.address.city, salon.address.state)) {
    throw new Error(`CITY_NOT_SUPPORTED: ${UNSUPPORTED_CITY_MESSAGE}`);
  }
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
        isVerified: true,
        isActive: true,
        approvalStatus: 'APPROVED',
        rejectionReason: null,
        approvalUpdatedAt: new Date(),
        approvalUpdatedBy: new Types.ObjectId(currentUser._id),
      },
    },
    { new: true, runValidators: true },
  );
  if (!updatedSalon) throw new Error('SALON_APPROVAL_CONFLICT: Salon approval changed while it was being reviewed');
  void recordAuditEvent({ actor: currentUser, action: 'SALON_VERIFIED', entityType: 'Salon', entityId: salonId });
  return updatedSalon;
}

/**
 * Unverify a salon (ADMIN/SUPER_ADMIN only)
 */
export async function unverifySalon(salonId: string, currentUser: AuthUser): Promise<ISalon> {
  await connectDB();

  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN;
  if (!isAdmin) {
    throw new Error('SALON_VERIFICATION_DENIED: Only admins can unverify salons');
  }

  const salon = await Salon.findById(salonId);
  if (!salon) {
    throw new Error('SALON_NOT_FOUND: Salon not found');
  }

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
        isVerified: false,
        isActive: false,
        approvalStatus: 'PENDING',
        rejectionReason: null,
        approvalUpdatedAt: new Date(),
        approvalUpdatedBy: new Types.ObjectId(currentUser._id),
      },
    },
    { new: true, runValidators: true },
  );
  if (!updatedSalon) throw new Error('SALON_APPROVAL_CONFLICT: Salon approval changed while it was being reviewed');
  void recordAuditEvent({ actor: currentUser, action: 'SALON_UNVERIFIED', entityType: 'Salon', entityId: salonId });
  return updatedSalon;
}

/**
 * List salons with pagination and filtering
 */
export async function listSalons(options: {
  page?: number;
  limit?: number;
  city?: string;
  area?: string;
  state?: string;
  isVerified?: boolean;
  isActive?: boolean;
  slug?: string;
  search?: string;
  serviceSearch?: string;
  category?: string;
  salonTypes?: SalonType[];
  sortBy?: string;
}): Promise<{ salons: Array<ISalon & { isDemoPreview?: boolean }>; total: number; page: number; limit: number }> {
  const page = Math.min(1000, Math.max(1, options.page || 1));
  const limit = Math.min(options.limit || 20, 50); // Max 50
  const publicListing = options.isActive !== false;
  const supportedLocationFilter = publicListing
    ? getSupportedSalonLocationFilter(options.city, options.state)
    : undefined;

  if (publicListing && !supportedLocationFilter) {
    return { salons: [], total: 0, page, limit };
  }

  await connectDB();
  const query: Record<string, unknown> = {};

  if (options.serviceSearch || options.category) {
    const matchingSalonIds = await Service.distinct(
      'salon',
      buildActiveServiceSearchFilter({
        serviceSearch: options.serviceSearch,
        category: options.category,
      }),
    ).maxTimeMS(5000);
    query._id = { $in: matchingSalonIds };
  }
  if (options.salonTypes?.length) {
    query.salonType = { $in: options.salonTypes };
  }

  // Filters
  if (options.city) {
    query['address.city'] = new RegExp(`^\\s*${options.city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
  }
  if (options.area) {
    query['address.area'] = new RegExp(escapeRegex(options.area.trim()), 'i');
  }
  if (options.state && !publicListing) {
    query['address.state'] = new RegExp(options.state, 'i');
  }
  if (options.isVerified !== undefined) {
    query.isVerified = options.isVerified;
  }
  // Active by default in public listing
  if (options.isActive !== undefined) {
    query.isActive = options.isActive;
  } else {
    query.isActive = true;
  }
  if (publicListing) {
    query.isVerified = true;
    query.approvalStatus = APPROVED_SALON_STATUS_FILTER;
    query.$and = [supportedLocationFilter];
  }

  if (options.slug) {
    query.slug = options.slug.trim().toLowerCase();
  }

  // Search
  if (options.search) {
    const search = escapeRegex(options.search.trim());
    const searchMatches = [
      { name: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { 'address.area': new RegExp(search, 'i') },
    ];
    query.$and = [...((query.$and as object[] | undefined) || []), { $or: searchMatches }];
  }

  // Count total
  const total = await Salon.countDocuments(query).maxTimeMS(5000);

  // Sorting
  let sortObj: Record<string, 1 | -1> = { createdAt: -1 }; // Default: newest
  if (options.sortBy) {
    if (options.sortBy === 'rating') {
      sortObj = { rating: -1 };
    } else if (options.sortBy === 'name') {
      sortObj = { name: 1 };
    } else if (options.sortBy === 'newest') {
      sortObj = { createdAt: -1 };
    }
  }

  // Fetch salons
  const salons = await Salon.find(query)
    .select(`name slug salonType description logo coverImage images address.area address.city address.state rating reviewCount isVerified${publicListing ? ' +demoKey' : ''}`)
    .sort(sortObj)
    .skip((page - 1) * limit)
    .limit(limit)
    .maxTimeMS(5000)
    .lean();
  const listedSalons = publicListing
    ? salons.map((salon) => {
        const isDemoPreview = salon.demoKey?.startsWith(FEATURE22_DEMO_KEY_PREFIX) ?? false;
        delete salon.demoKey;
        salon.isDemoPreview = isDemoPreview;
        return salon;
      })
    : salons;

  return {
    salons: listedSalons,
    total,
    page,
    limit,
  };
}

/**
 * Get all salons for an owner
 */
export async function getSalonsForOwner(ownerId: string): Promise<ISalon[]> {
  await connectDB();
  const salons = await Salon.find({ owner: ownerId }).sort({ createdAt: -1 });
  return salons;
}

/**
 * Soft delete a salon (deactivate, don't physically delete)
 */
export async function softDeleteSalon(salonId: string, currentUser: AuthUser): Promise<ISalon> {
  // Soft delete is the same as deactivate
  return deactivateSalon(salonId, currentUser);
}
