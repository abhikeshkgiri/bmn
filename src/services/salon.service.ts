/**
 * Salon Service Layer
 * Business logic for salon operations
 */

import { connectDB } from '@/lib/db';
import Salon from '@/models/Salon';
import User from '@/models/User';
import { generateUniqueSlug } from '@/utils/slug';
import { normalizePhoneNumber } from '@/utils/phone';
import { USER_ROLES } from '@/constants/roles';
import type { AuthUser } from '@/types';
import type { SalonCreateInput, SalonUpdateInput } from '@/validations/salon.schema';
import type { ISalon } from '@/models/Salon';
import { recordAuditEvent } from '@/services/audit.service';

export interface SalonWithOwner extends Omit<ISalon, 'owner'> {
  owner: AuthUser;
}

/**
 * Create a new salon
 * Only SALON_OWNER, ADMIN, SUPER_ADMIN can create
 */
export async function createSalon(
  input: SalonCreateInput,
  currentUser: AuthUser
): Promise<ISalon> {
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

  // Generate unique slug
  const slug = await generateUniqueSlug(input.name);

  // Normalize phone number
  const normalizedPhone = normalizePhoneNumber(input.contact.phone);

  // Create salon
  const salon = await Salon.create({
    name: input.name,
    slug,
    description: input.description || '',
    logo: input.logo || null,
    coverImage: input.coverImage || null,
    owner: ownerId,
    address: input.address,
    location: input.location,
    contact: {
      phone: normalizedPhone,
      email: input.contact.email || null,
      website: input.contact.website || null,
    },
    openingHours: input.openingHours,
    facilities: input.facilities || [],
    isActive: true,
    isVerified: false,
  });

  return salon;
}

/**
 * Get salon by ID
 */
export async function getSalonById(salonId: string): Promise<ISalon | null> {
  await connectDB();
  const salon = await Salon.findById(salonId).populate('owner', 'name phone email role');
  return salon;
}

/**
 * Get salon by slug (public)
 */
export async function getSalonBySlug(slug: string): Promise<ISalon | null> {
  await connectDB();
  const salon = await Salon.findOne({ slug }).populate('owner', 'name phone email role');
  return salon;
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
  const isOwner = salon.owner.toString() === currentUser._id;
  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN;
  if (!isOwner && !isAdmin) {
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
  const isOwner = salon.owner.toString() === currentUser._id;
  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN;
  if (!isOwner && !isAdmin) {
    throw new Error('SALON_ACCESS_DENIED: You can only edit your own salon');
  }

  // Update allowed fields
  if (input.name) salon.name = input.name;
  if (input.description !== undefined) salon.description = input.description || '';
  if (input.logo !== undefined) salon.logo = input.logo || null;
  if (input.coverImage !== undefined) salon.coverImage = input.coverImage || null;

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
  const isOwner = salon.owner.toString() === currentUser._id;
  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN;

  if (!isOwner && !isAdmin) {
    throw new Error('SALON_ACCESS_DENIED: You can only manage your own salon');
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
  const isOwner = salon.owner.toString() === currentUser._id;
  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN;

  if (!isOwner && !isAdmin) {
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

  salon.isVerified = true;
  await salon.save();
  void recordAuditEvent({ actor: currentUser, action: 'SALON_VERIFIED', entityType: 'Salon', entityId: salonId });
  return salon;
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

  salon.isVerified = false;
  await salon.save();
  void recordAuditEvent({ actor: currentUser, action: 'SALON_UNVERIFIED', entityType: 'Salon', entityId: salonId });
  return salon;
}

/**
 * List salons with pagination and filtering
 */
export async function listSalons(options: {
  page?: number;
  limit?: number;
  city?: string;
  state?: string;
  isVerified?: boolean;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
}): Promise<{ salons: ISalon[]; total: number; page: number; limit: number }> {
  await connectDB();

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(options.limit || 20, 50); // Max 50

  const query: Record<string, unknown> = {};

  // Filters
  if (options.city) {
    query['address.city'] = new RegExp(options.city, 'i');
  }
  if (options.state) {
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

  // Search
  if (options.search) {
    query.$or = [
      { name: new RegExp(options.search, 'i') },
      { description: new RegExp(options.search, 'i') },
      { 'address.area': new RegExp(options.search, 'i') },
    ];
  }

  // Count total
  const total = await Salon.countDocuments(query);

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
    .sort(sortObj)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('owner', 'name phone email');

  return {
    salons,
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
