/**
 * Service Service Layer
 * Business logic for service operations
 */

import { connectDB } from '@/lib/db';
import Service from '@/models/Service';
import Salon from '@/models/Salon';
import User from '@/models/User';
import { USER_ROLES } from '@/constants/roles';
import type { AuthUser } from '@/types';
import type { ServiceCreateInput, ServiceUpdateInput } from '@/validations/service.schema';
import type { IService } from '@/models/Service';

export interface ListServicesOptions {
  salonId?: string;
  category?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'name' | 'price' | 'duration';
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Generate unique slug for service within a salon
 */
async function generateServiceSlug(
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
    throw new Error('SERVICE_INVALID_NAME: Service name must contain valid characters');
  }

  // Check if slug already exists for this salon
  let slug = baseSlug;
  let counter = 1;
  const maxAttempts = 100;

  while (counter <= maxAttempts) {
    const existing = await Service.findOne({
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
 * Create a new service
 * Only SALON_OWNER, ADMIN, SUPER_ADMIN can create
 */
export async function createService(
  input: ServiceCreateInput,
  currentUser: AuthUser
): Promise<IService> {
  await connectDB();

  // Verify user role can create services
  if (
    currentUser.role !== USER_ROLES.SALON_OWNER &&
    currentUser.role !== USER_ROLES.ADMIN &&
    currentUser.role !== USER_ROLES.SUPER_ADMIN
  ) {
    throw new Error('SERVICE_ACCESS_DENIED: Your role cannot create services');
  }

  // Verify user is active
  const user = await User.findById(currentUser._id);
  if (!user || !user.isActive) {
    throw new Error('USER_INACTIVE: Your account is inactive');
  }

  // Verify salon exists
  const salon = await Salon.findById(input.salonId);
  if (!salon) {
    throw new Error('SALON_NOT_FOUND: Salon not found');
  }

  // Verify ownership - SALON_OWNER must own the salon
  if (currentUser.role === USER_ROLES.SALON_OWNER) {
    if (salon.owner.toString() !== currentUser._id) {
      throw new Error('SALON_ACCESS_DENIED: You can only create services for your own salon');
    }
  }
  // ADMIN and SUPER_ADMIN can create services for any salon
  // (no additional check needed)

  // Generate unique slug for this salon
  const slug = await generateServiceSlug(input.name, input.salonId);

  // Create service
  const service = await Service.create({
    salon: input.salonId,
    name: input.name,
    slug,
    description: input.description || null,
    category: input.category,
    image: input.image || null,
    duration: input.duration,
    price: input.price,
    discountPrice: input.discountPrice || null,
    isActive: true,
  });

  return service;
}

/**
 * Get service by ID
 * Public users see only active services
 * Authorized salon users and admins can see inactive services
 */
export async function getServiceById(
  serviceId: string,
  currentUser?: AuthUser
): Promise<IService | null> {
  await connectDB();

  const service = await Service.findById(serviceId).populate('salon');

  if (!service) {
    return null;
  }

  // If not authenticated, only allow viewing active services
  if (!currentUser) {
    if (!service.isActive) {
      return null;
    }
    return service;
  }

  // If authenticated, check if user can view inactive services
  if (!service.isActive) {
    // ADMIN/SUPER_ADMIN can view all services
    if (
      currentUser.role === USER_ROLES.ADMIN ||
      currentUser.role === USER_ROLES.SUPER_ADMIN
    ) {
      return service;
    }

    // SALON_OWNER can view inactive services only if they own the salon
    if (currentUser.role === USER_ROLES.SALON_OWNER) {
      const salon = typeof service.salon === 'object' ? service.salon : await Salon.findById(service.salon);
      if (salon && salon.owner.toString() === currentUser._id) {
        return service;
      }
    }

    // SALON_STAFF can view inactive services if assigned to the salon
    if (currentUser.role === USER_ROLES.SALON_STAFF) {
      const salon = typeof service.salon === 'object' ? service.salon : await Salon.findById(service.salon);
      if (salon && salon.staff?.includes(currentUser._id)) {
        return service;
      }
    }

    // Otherwise, don't show inactive services
    return null;
  }

  return service;
}

/**
 * List services with pagination, filtering, and search
 */
export async function listServices(options: ListServicesOptions = {}): Promise<{
  data: IService[];
  pagination: PaginationData;
}> {
  await connectDB();

  const {
    salonId,
    category,
    isActive = true,
    search = '',
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
  } = options;

  // Validate pagination
  const validLimit = Math.min(Math.max(1, limit), 50);
  const validPage = Math.max(1, page);

  // Build query
  const query: Record<string, unknown> = {};

  if (salonId) {
    query.salon = salonId;
  }

  if (category) {
    query.category = category;
  }

  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  // Search in name and description
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Build sort
  const sortMap: Record<string, Record<string, 1 | -1>> = {
    createdAt: { createdAt: -1 },
    name: { name: 1 },
    price: { price: 1 },
    duration: { duration: 1 },
  };
  const sort = sortMap[sortBy] || sortMap.createdAt;

  // Execute query with pagination
  const total = await Service.countDocuments(query);
  const data = await Service.find(query)
    .sort(sort)
    .skip((validPage - 1) * validLimit)
    .limit(validLimit)
    .populate('salon', 'name slug');

  const pagination: PaginationData = {
    page: validPage,
    limit: validLimit,
    total,
    totalPages: Math.ceil(total / validLimit),
  };

  return { data, pagination };
}

/**
 * Get services by salon
 */
export async function getServicesBySalon(
  salonId: string,
  isActive?: boolean
): Promise<IService[]> {
  await connectDB();

  const query: Record<string, unknown> = { salon: salonId };

  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  return await Service.find(query).sort({ createdAt: -1 });
}

/**
 * Update a service
 * Only owner or admin can update
 */
export async function updateService(
  serviceId: string,
  input: ServiceUpdateInput,
  currentUser: AuthUser
): Promise<IService> {
  await connectDB();

  const service = await Service.findById(serviceId);
  if (!service) {
    throw new Error('SERVICE_NOT_FOUND: Service not found');
  }

  // Check authorization
  const isOwner = async () => {
    const salon = await Salon.findById(service.salon);
    return salon && salon.owner.toString() === currentUser._id;
  };

  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN;

  const ownerCheck = await isOwner();
  if (!ownerCheck && !isAdmin) {
    throw new Error('SERVICE_ACCESS_DENIED: You can only update your own salon services');
  }

  // Update allowed fields only
  if (input.name) {
    service.name = input.name;
    // Regenerate slug if name changed (keeping uniqueness within salon)
    service.slug = await generateServiceSlug(input.name, service.salon.toString(), serviceId);
  }

  if (input.description !== undefined) {
    service.description = input.description || null;
  }

  if (input.category) {
    service.category = input.category;
  }

  if (input.image !== undefined) {
    service.image = input.image || null;
  }

  if (input.duration) {
    service.duration = input.duration;
  }

  if (input.price) {
    service.price = input.price;
  }

  if (input.discountPrice !== undefined) {
    service.discountPrice = input.discountPrice || null;
  }

  await service.save();
  return service;
}

/**
 * Update service status (activate/deactivate)
 */
export async function updateServiceStatus(
  serviceId: string,
  isActive: boolean,
  currentUser: AuthUser
): Promise<IService> {
  await connectDB();

  const service = await Service.findById(serviceId);
  if (!service) {
    throw new Error('SERVICE_NOT_FOUND: Service not found');
  }

  // Check authorization
  const salon = await Salon.findById(service.salon);
  if (!salon) {
    throw new Error('SALON_NOT_FOUND: Associated salon not found');
  }

  const isOwner = salon.owner.toString() === currentUser._id;
  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN;

  if (!isOwner && !isAdmin) {
    throw new Error('SERVICE_ACCESS_DENIED: You can only update your own salon services');
  }

  service.isActive = isActive;
  await service.save();
  return service;
}

/**
 * Soft delete a service (set isActive to false)
 */
export async function deleteService(
  serviceId: string,
  currentUser: AuthUser
): Promise<IService> {
  await connectDB();

  const service = await Service.findById(serviceId);
  if (!service) {
    throw new Error('SERVICE_NOT_FOUND: Service not found');
  }

  // Check authorization
  const salon = await Salon.findById(service.salon);
  if (!salon) {
    throw new Error('SALON_NOT_FOUND: Associated salon not found');
  }

  const isOwner = salon.owner.toString() === currentUser._id;
  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN;

  if (!isOwner && !isAdmin) {
    throw new Error('SERVICE_ACCESS_DENIED: You can only delete your own salon services');
  }

  service.isActive = false;
  await service.save();
  return service;
}
