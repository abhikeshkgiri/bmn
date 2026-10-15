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
import { getSupportedSalonLocationFilter, normalizeSupportedSalonLocation } from '@/constants/launch-cities';
import { APPROVED_SALON_STATUS_FILTER, isSalonApproved } from '@/utils/salon-approval';
import { FEATURE22_DEMO_KEY_PREFIX } from '@/lib/feature22-demo-data';

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function filterInactiveServices(barber: IBarber): void {
  const populatedServices = barber.get('services');
  const services = (Array.isArray(populatedServices) ? populatedServices : []) as Array<{
    isActive?: boolean;
    toObject: () => Record<string, unknown>;
  }>;
  const visibleServices = services
    .filter((service) => service && service.isActive)
    .map((service) => {
      const data = service.toObject();
      delete data.isActive;
      return data;
    });
  barber.set('services', visibleServices);
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

  if (input.userId) {
    const barberUser = await User.findById(input.userId);
    if (!barberUser) {
      throw new Error('USER_NOT_FOUND: User not found');
    }
    if (!barberUser.isActive) {
      throw new Error('USER_INACTIVE');
    }
    if (barberUser.role !== USER_ROLES.BARBER) {
      throw new Error('BARBER_ROLE_REQUIRED');
    }

    const existingBarber = await Barber.findOne({ user: input.userId });
    if (existingBarber?.salon.toString() === input.salonId) {
      throw new Error('BARBER_DUPLICATE: User is already a barber in this salon');
    }
    if (existingBarber) {
      throw new Error('BARBER_ALREADY_ASSOCIATED');
    }
  } else if (currentUser.role !== USER_ROLES.SALON_OWNER) {
    throw new Error('BARBER_ACCOUNT_REQUIRED');
  }

  // Verify all services belong to the salon
  if (input.services && input.services.length > 0) {
    const services = await Service.find({
      _id: { $in: input.services },
      salon: input.salonId,
      isActive: true,
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
    user: input.userId || null,
    salon: input.salonId,
    name: input.name,
    title: input.title || null,
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

  const barber = await Barber.findById(barberId)
    .populate('salon', 'name slug')
    .populate('services', 'name slug description category duration price discountPrice image isActive');

  if (!barber) {
    return null;
  }

  const salonId = barber.salon._id?.toString() || barber.salon.toString();
  const salon = await Salon.findById(salonId);
  if (!salon) return null;
  const barberUserId = barber.user?.toString();
  const isAdmin = currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.SUPER_ADMIN;
  const isOwner = currentUser?.role === USER_ROLES.SALON_OWNER && salon.owner.toString() === currentUser._id;
  const isBarber = currentUser?.role === USER_ROLES.BARBER && barberUserId === currentUser._id;
  const isPublished = salon.isActive && isSalonApproved(salon) &&
    Boolean(normalizeSupportedSalonLocation(salon.address.city, salon.address.state));

  if (!barber.user && barber.isActive && isPublished) {
    if (!isAdmin && !isOwner) filterInactiveServices(barber);
    return barber;
  }
  if (barber.user && barber.isActive && barber.isVerified && isPublished) {
    const activeBarberAccount = await User.exists({
      _id: barberUserId,
      role: USER_ROLES.BARBER,
      isActive: true,
    });
    if (!activeBarberAccount) return null;
    if (!isAdmin && !isOwner && !isBarber) filterInactiveServices(barber);
    if (!isAdmin && !isOwner && !isBarber) barber.set('user', undefined);
    return barber;
  }
  if (isAdmin || isOwner || isBarber) return barber;
  if (currentUser?.role === USER_ROLES.SALON_OWNER) {
    throw new Error('BARBER_ACCESS_DENIED: You do not have access to this barber');
  }
  return null;
}

/**
 * Get barber by slug
 */
export async function getBarberBySlug(slug: string, currentUser?: AuthUser): Promise<IBarber | null> {
  await connectDB();

  const barber = await Barber.findOne({ slug })
    .populate('salon', 'name slug')
    .populate('services', 'name slug description category duration price discountPrice image isActive');

  if (!barber) {
    return null;
  }

  const salonId = barber.salon._id?.toString() || barber.salon.toString();
  const salon = await Salon.findById(salonId);
  if (!salon) return null;
  const barberUserId = barber.user?.toString();
  const isAdmin = currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.SUPER_ADMIN;
  const isOwner = currentUser?.role === USER_ROLES.SALON_OWNER && salon.owner.toString() === currentUser._id;
  const isBarber = currentUser?.role === USER_ROLES.BARBER && barberUserId === currentUser._id;
  const isPublished = salon.isActive && isSalonApproved(salon) &&
    Boolean(normalizeSupportedSalonLocation(salon.address.city, salon.address.state));
  if (!barber.user && barber.isActive && isPublished) {
    if (!isAdmin && !isOwner) filterInactiveServices(barber);
    return barber;
  }
  if (barber.user && barber.isActive && barber.isVerified && isPublished) {
    const activeBarberAccount = await User.exists({
      _id: barberUserId,
      role: USER_ROLES.BARBER,
      isActive: true,
    });
    if (!activeBarberAccount) return null;
    if (!isAdmin && !isOwner && !isBarber) filterInactiveServices(barber);
    if (!isAdmin && !isOwner && !isBarber) barber.set('user', undefined);
    return barber;
  }
  if (isAdmin || isOwner || isBarber) return barber;
  return null;
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
  const isAdmin = currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.SUPER_ADMIN;
  const isSalonOwner = currentUser?.role === USER_ROLES.SALON_OWNER;
  const isPublic = !isAdmin && !isSalonOwner;
  let publicSalonIds: Array<{ toString(): string }> = [];

  if (isSalonOwner) {
    const salon = await Salon.findOne({ owner: currentUser!._id }).select('_id').lean();
    if (!salon) {
      query.salon = null;
    } else {
      if (options.salonId && options.salonId !== salon._id.toString()) {
        throw new Error('BARBER_ACCESS_DENIED: You do not own this salon');
      }
      query.salon = salon._id;
    }
  } else if (!isAdmin) {
    const supportedLocation = getSupportedSalonLocationFilter();
    publicSalonIds = supportedLocation
      ? await Salon.find({
          isActive: true,
          isVerified: true,
          approvalStatus: APPROVED_SALON_STATUS_FILTER,
          ...supportedLocation,
        }).distinct('_id')
      : [];
    const activeBarberUserIds = await User.find({
      role: USER_ROLES.BARBER,
      isActive: true,
    }).distinct('_id');
    query.isActive = true;
    query.$and = [{
      $or: [
        { user: null },
        { user: { $in: activeBarberUserIds }, isVerified: true },
      ],
    }];
    query.salon = { $in: publicSalonIds };
  }

  // Filter by salon
  if (options.salonId) {
    if (isAdmin) {
      query.salon = options.salonId;
    } else if (!isSalonOwner) {
      query.salon = { $in: publicSalonIds.filter((salonId) => salonId.toString() === options.salonId) };
    }
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
  if (options.isActive !== undefined && (isAdmin || isSalonOwner)) {
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
  const barberQuery = Barber.find(query).sort(sort).skip(skip).limit(limit);
  const barbers = isPublic
    ? await barberQuery
      .select('name slug profileImage bio experienceYears specializations services portfolio rating reviewCount isAvailable offersHomeService homeServiceRadius isVerified isActive salon +demoKey')
      .populate('salon', 'name slug')
      .populate({ path: 'services', select: 'name slug duration price discountPrice category', match: { isActive: true } })
    : await barberQuery.populate(['user', 'salon', 'services']);

  if (isPublic) {
    for (const barber of barbers) {
      const isDemoPreview = barber.demoKey?.startsWith(FEATURE22_DEMO_KEY_PREFIX) ?? false;
      barber.set('demoKey', undefined);
      barber.set('isDemoPreview', isDemoPreview, { strict: false });
    }
  }

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
    if (barber.user?.toString() !== currentUser._id) {
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
      isActive: true,
    });

    if (services.length !== input.services.length) {
      throw new Error('SERVICE_INVALID: Some services do not belong to this salon');
    }
  }

  // Validate home service settings
  // Update allowed fields
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.title !== undefined) updateData.title = input.title || null;
  if (input.bio !== undefined) updateData.bio = input.bio || null;
  if (input.profileImage !== undefined) updateData.profileImage = input.profileImage || null;
  if (input.experienceYears !== undefined) updateData.experienceYears = input.experienceYears;
  if (input.specializations) updateData.specializations = input.specializations;
  if (input.services) updateData.services = input.services;
  if (input.portfolio) updateData.portfolio = input.portfolio;
  if (input.offersHomeService !== undefined) updateData.offersHomeService = input.offersHomeService;
  if (input.offersHomeService === false) updateData.homeServiceRadius = null;
  else if (input.homeServiceRadius !== undefined) updateData.homeServiceRadius = input.homeServiceRadius;
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
