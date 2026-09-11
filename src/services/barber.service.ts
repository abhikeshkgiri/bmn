/**
 * Barber Service Layer
 * Business logic for barber operations
 */

import { connectDB } from '@/lib/db';
import Barber from '@/models/Barber';
import User from '@/models/User';
import Salon from '@/models/Salon';
import Service from '@/models/Service';
import { USER_ROLES } from '@/constants/roles';
import type { AuthUser } from '@/types';
import type { BarberCreateInput, BarberUpdateInput, BarberListQuery } from '@/validations/barber.schema';
import type { IBarber } from '@/models/Barber';
import { recordAuditEvent } from '@/services/audit.service';

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Generate unique slug for barber within a salon
 */
async function generateBarberSlug(
  name: string,
  salonId: string,
  excludeId?: string
): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();

  if (!baseSlug) {
    throw new Error('BARBER_INVALID_NAME: Barber name must contain valid characters');
  }

  // Check if slug already exists for this salon
  let slug = baseSlug;
  let counter = 1;
  const maxAttempts = 100;

  while (counter <= maxAttempts) {
    const existing = await Barber.findOne({
      salon: salonId,
      slug,
      ...(excludeId && { _id: { $ne: excludeId } }),
    });

    if (!existing) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  // Fallback to timestamp suffix
  return `${baseSlug}-${Date.now()}`;
}

/**
 * Create a new barber
 * Only SALON_OWNER, ADMIN, SUPER_ADMIN can create
 */
export async function createBarber(
  input: BarberCreateInput,
  currentUser: AuthUser
): Promise<IBarber> {
  await connectDB();

  // Verify user role can create barbers
  if (
    currentUser.role !== USER_ROLES.SALON_OWNER &&
    currentUser.role !== USER_ROLES.ADMIN &&
    currentUser.role !== USER_ROLES.SUPER_ADMIN
  ) {
    throw new Error('BARBER_ACCESS_DENIED: Your role cannot create barbers');
  }

  // Verify current user is active
  const creatorUser = await User.findById(currentUser._id);
  if (!creatorUser || !creatorUser.isActive) {
    throw new Error('USER_INACTIVE: Your account is inactive');
  }

  // Verify salon exists
  const salon = await Salon.findById(input.salonId);
  if (!salon) {
    throw new Error('SALON_NOT_FOUND: Salon not found');
  }

  // Verify ownership of salon for SALON_OWNER
  if (currentUser.role === USER_ROLES.SALON_OWNER) {
    if (salon.owner.toString() !== currentUser._id) {
      throw new Error('SALON_ACCESS_DENIED: You do not own this salon');
    }
  }

  // Verify user exists
  const barberUser = await User.findById(input.userId);
  if (!barberUser) {
    throw new Error('USER_NOT_FOUND: User not found');
  }

  // Verify user is not already a barber in this salon
  const existingBarber = await Barber.findOne({
    user: input.userId,
    salon: input.salonId,
  });
  if (existingBarber) {
    throw new Error('BARBER_DUPLICATE: User is already a barber in this salon');
  }

  // Verify all services belong to the salon
  if (input.services && input.services.length > 0) {
    const services = await Service.find({
      _id: { $in: input.services },
      salon: input.salonId,
    });

    if (services.length !== input.services.length) {
      throw new Error('SERVICE_INVALID: Some services do not belong to this salon');
    }
  }

  // Generate unique slug
  const slug = await generateBarberSlug(input.name, input.salonId);

  // Validate home service settings
  let homeServiceRadius = input.homeServiceRadius;
  if (!input.offersHomeService) {
    homeServiceRadius = undefined;
  }

  // Create barber
  const barber = await Barber.create({
    user: input.userId,
    salon: input.salonId,
    name: input.name,
    slug,
    bio: input.bio || null,
    profileImage: input.profileImage || null,
    experienceYears: input.experienceYears || 0,
    specializations: input.specializations || [],
    services: input.services || [],
    portfolio: input.portfolio || [],
    offersHomeService: input.offersHomeService || false,
    homeServiceRadius: homeServiceRadius || null,
    isActive: true,
    isVerified: false,
    isAvailable: true,
    rating: 0,
    reviewCount: 0,
  });

  return barber.populate(['user', 'salon', 'services']);
}

/**
 * Get barber by ID
 */
export async function getBarberById(
  barberId: string,
  currentUser?: AuthUser
): Promise<IBarber | null> {
  await connectDB();

  const barber = await Barber.findById(barberId).populate(['user', 'salon', 'services']);

  if (!barber) {
    return null;
  }

  // Public users only see active barbers
  if (!currentUser && !barber.isActive) {
    return null;
  }

  // Authenticated users can see inactive if they own salon or are admin
  if (!currentUser && !barber.isActive) {
    throw new Error('BARBER_NOT_FOUND: Barber not found');
  }

  if (currentUser && !barber.isActive) {
    // Check if user owns the salon
    if (barber.salon._id?.toString() && currentUser.role === USER_ROLES.SALON_OWNER) {
      const salon = await Salon.findById(barber.salon._id);
      if (salon && salon.owner.toString() !== currentUser._id) {
        throw new Error('BARBER_ACCESS_DENIED: You do not have access to this barber');
      }
    } else if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.SUPER_ADMIN) {
      throw new Error('BARBER_ACCESS_DENIED: You do not have access to this barber');
    }
  }

  return barber;
}

/**
 * Get barber by slug
 */
export async function getBarberBySlug(slug: string, currentUser?: AuthUser): Promise<IBarber | null> {
  await connectDB();

  const barber = await Barber.findOne({ slug }).populate(['user', 'salon', 'services']);

  if (!barber) {
    return null;
  }

  // Public users only see active barbers
  if (!currentUser && !barber.isActive) {
    return null;
  }

  return barber;
}

/**
 * List barbers with filtering and pagination
 */
export async function listBarbers(
  options: BarberListQuery,
  currentUser?: AuthUser
): Promise<{ data: IBarber[]; pagination: PaginationData }> {
  await connectDB();

  const query: Record<string, unknown> = {};

  // Public users only see active barbers
  if (!currentUser) {
    query.isActive = true;
  }

  // Filter by salon
  if (options.salonId) {
    query.salon = options.salonId;
  }

  // Search
  if (options.search) {
    query.$or = [
      { name: { $regex: options.search, $options: 'i' } },
      { bio: { $regex: options.search, $options: 'i' } },
    ];
  }

  // Filter by specialization
  if (options.specialization) {
    query.specializations = { $in: [options.specialization] };
  }

  // Filter by service
  if (options.service) {
    query.services = options.service;
  }

  // Filter by home service
  if (options.offersHomeService === 'true') {
    query.offersHomeService = true;
  } else if (options.offersHomeService === 'false') {
    query.offersHomeService = false;
  }

  // Filter by active status
  if (options.isActive) {
    query.isActive = options.isActive === 'true';
  }

  // Filter by verified status (admin only)
  if (options.isVerified && currentUser && (currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN)) {
    query.isVerified = options.isVerified === 'true';
  }

  // Count total
  const total = await Barber.countDocuments(query);

  // Calculate pagination
  const page = options.page;
  const limit = options.limit;
  const skip = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);

  // Sort
  const sortField = options.sortBy || 'createdAt';
  const sort: Record<string, 1 | -1> = {};
  sort[sortField as string] = sortField === 'createdAt' ? -1 : 1;

  // Fetch barbers
  const barbers = await Barber.find(query)
    .populate(['user', 'salon', 'services'])
    .sort(sort)
    .skip(skip)
    .limit(limit);

  return {
    data: barbers,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Get all barbers for a salon
 */
export async function getBarbersBySalon(salonId: string, isActive?: boolean): Promise<IBarber[]> {
  await connectDB();

  const query: Record<string, unknown> = { salon: salonId };
  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  const barbers = await Barber.find(query).populate(['user', 'salon', 'services']).sort({ createdAt: -1 });
  return barbers;
}

/**
 * Update barber
 */
export async function updateBarber(
  barberId: string,
  input: BarberUpdateInput,
  currentUser: AuthUser
): Promise<IBarber> {
  await connectDB();

  const barber = await Barber.findById(barberId);
  if (!barber) {
    throw new Error('BARBER_NOT_FOUND: Barber not found');
  }

  const salon = await Salon.findById(barber.salon);
  if (!salon) {
    throw new Error('SALON_NOT_FOUND: Salon not found');
  }

  // Authorization check
  if (currentUser.role === USER_ROLES.BARBER) {
    // Barber can only update their own profile
    if (barber.user.toString() !== currentUser._id) {
      throw new Error('BARBER_ACCESS_DENIED: You can only update your own profile');
    }
  } else if (currentUser.role === USER_ROLES.SALON_OWNER) {
    // Salon owner can only update own salon's barbers
    if (salon.owner.toString() !== currentUser._id) {
      throw new Error('BARBER_ACCESS_DENIED: You do not own this barber\'s salon');
    }
  } else if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.SUPER_ADMIN) {
    throw new Error('BARBER_ACCESS_DENIED: You do not have permission to update barbers');
  }

  // Validate services if provided
  if (input.services && input.services.length > 0) {
    const services = await Service.find({
      _id: { $in: input.services },
      salon: barber.salon,
    });

    if (services.length !== input.services.length) {
      throw new Error('SERVICE_INVALID: Some services do not belong to this salon');
    }
  }

  // Validate home service settings
  if (input.offersHomeService === false) {
    input.homeServiceRadius = undefined;
  }

  // Update allowed fields
  const updateData: Record<string, unknown> = {};
  if (input.name) updateData.name = input.name;
  if (input.bio) updateData.bio = input.bio;
  if (input.profileImage) updateData.profileImage = input.profileImage;
  if (input.experienceYears !== undefined) updateData.experienceYears = input.experienceYears;
  if (input.specializations) updateData.specializations = input.specializations;
  if (input.services) updateData.services = input.services;
  if (input.portfolio) updateData.portfolio = input.portfolio;
  if (input.offersHomeService !== undefined) updateData.offersHomeService = input.offersHomeService;
  if (input.homeServiceRadius) updateData.homeServiceRadius = input.homeServiceRadius;
  if (input.isAvailable !== undefined) updateData.isAvailable = input.isAvailable;

  // Regenerate slug if name changed
  if (input.name && input.name !== barber.name) {
    updateData.slug = await generateBarberSlug(input.name, barber.salon.toString(), barberId);
  }

  const updated = await Barber.findByIdAndUpdate(barberId, updateData, { new: true }).populate(['user', 'salon', 'services']);

  if (!updated) {
    throw new Error('BARBER_UPDATE_FAILED: Failed to update barber');
  }

  return updated;
}

/**
 * Update barber status (isActive)
 */
export async function updateBarberStatus(
  barberId: string,
  isActive: boolean,
  currentUser: AuthUser
): Promise<IBarber> {
  await connectDB();

  const barber = await Barber.findById(barberId);
  if (!barber) {
    throw new Error('BARBER_NOT_FOUND: Barber not found');
  }

  const salon = await Salon.findById(barber.salon);
  if (!salon) {
    throw new Error('SALON_NOT_FOUND: Salon not found');
  }

  // Authorization check
  if (currentUser.role === USER_ROLES.SALON_OWNER) {
    if (salon.owner.toString() !== currentUser._id) {
      throw new Error('BARBER_ACCESS_DENIED: You do not own this barber\'s salon');
    }
  } else if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.SUPER_ADMIN) {
    throw new Error('BARBER_ACCESS_DENIED: You do not have permission to update barber status');
  }

  const updated = await Barber.findByIdAndUpdate(barberId, { isActive }, { new: true }).populate(['user', 'salon', 'services']);

  if (!updated) {
    throw new Error('BARBER_UPDATE_FAILED: Failed to update barber status');
  }

  void recordAuditEvent({
    actor: currentUser,
    action: isActive ? 'BARBER_ACTIVATED' : 'BARBER_DEACTIVATED',
    entityType: 'Barber',
    entityId: barberId,
  });

  return updated;
}

/**
 * Verify barber (admin only)
 */
export async function verifyBarber(
  barberId: string,
  isVerified: boolean,
  currentUser: AuthUser
): Promise<IBarber> {
  await connectDB();

  // Only admins can verify
  if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.SUPER_ADMIN) {
    throw new Error('BARBER_VERIFICATION_DENIED: Only admins can verify barbers');
  }

  const barber = await Barber.findById(barberId);
  if (!barber) {
    throw new Error('BARBER_NOT_FOUND: Barber not found');
  }

  const updated = await Barber.findByIdAndUpdate(barberId, { isVerified }, { new: true }).populate(['user', 'salon', 'services']);

  if (!updated) {
    throw new Error('BARBER_UPDATE_FAILED: Failed to verify barber');
  }

  void recordAuditEvent({
    actor: currentUser,
    action: isVerified ? 'BARBER_VERIFIED' : 'BARBER_UNVERIFIED',
    entityType: 'Barber',
    entityId: barberId,
  });

  return updated;
}

/**
 * Delete barber (soft delete)
 */
export async function deleteBarber(barberId: string, currentUser: AuthUser): Promise<IBarber> {
  await connectDB();

  const barber = await Barber.findById(barberId);
  if (!barber) {
    throw new Error('BARBER_NOT_FOUND: Barber not found');
  }

  const salon = await Salon.findById(barber.salon);
  if (!salon) {
    throw new Error('SALON_NOT_FOUND: Salon not found');
  }

  // Authorization check
  if (currentUser.role === USER_ROLES.SALON_OWNER) {
    if (salon.owner.toString() !== currentUser._id) {
      throw new Error('BARBER_ACCESS_DENIED: You do not own this barber\'s salon');
    }
  } else if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.SUPER_ADMIN) {
    throw new Error('BARBER_ACCESS_DENIED: You do not have permission to delete barbers');
  }

  // Soft delete
  const updated = await Barber.findByIdAndUpdate(barberId, { isActive: false }, { new: true }).populate(['user', 'salon', 'services']);

  if (!updated) {
    throw new Error('BARBER_DELETE_FAILED: Failed to delete barber');
  }

  return updated;
}
