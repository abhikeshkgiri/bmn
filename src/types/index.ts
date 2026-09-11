/**
 * Centralized TypeScript types for the application
 * These types are derived from Mongoose models and used for API responses and application logic
 */

import type { IUser } from '@/models/User';
import type { ISalon, IAddress, IOpeningHours, ILocation } from '@/models/Salon';
import type { IBarber, IPortfolioItem } from '@/models/Barber';
import type { IService } from '@/models/Service';
import type { IBooking } from '@/models/Booking';
import type { IPayment } from '@/models/Payment';
import type { UserRole } from '@/constants/roles';
import type { BookingStatus, BookingType, PaymentStatus, PaymentMethod } from '@/constants/booking';
import type { ServiceCategory, BarberSpecialization, SalonFacility } from '@/constants/services';

// Re-export model types
export type { IUser, ISalon, IBarber, IService, IBooking, IPayment };
export type { IAddress, IOpeningHours, ILocation, IPortfolioItem };
export type { UserRole };

// API Response types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  error?: string;
}

// User response (excludes sensitive fields)
export interface UserResponse {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Salon response
export interface SalonResponse {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  images?: string[];
  owner: string;
  staff?: string[];
  barbers?: string[];
  services?: string[];
  address: IAddress;
  location: ILocation;
  contact: {
    phone: string;
    email?: string;
    website?: string;
  };
  openingHours: IOpeningHours;
  facilities: SalonFacility[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Barber response
export interface BarberResponse {
  _id: string;
  user: string;
  salon: string;
  name: string;
  slug: string;
  profileImage?: string;
  bio?: string;
  experienceYears: number;
  specializations: BarberSpecialization[];
  services?: string[];
  portfolio?: IPortfolioItem[];
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  offersHomeService: boolean;
  homeServiceRadius?: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Service response
export interface ServiceResponse {
  _id: string;
  salon: string;
  name: string;
  slug: string;
  description?: string;
  category: ServiceCategory;
  image?: string;
  duration: number;
  price: number;
  discountPrice?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Booking response
export interface BookingResponse {
  _id: string;
  bookingNumber: string;
  customer: string;
  salon: string;
  barber: string;
  service: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  servicePrice: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  bookingType: BookingType;
  customerNotes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

// Payment response
export interface PaymentResponse {
  _id: string;
  booking: string;
  customer: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  provider: string;
  providerOrderId: string;
  providerPaymentId?: string;
  status: PaymentStatus;
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
}

// Query filters
export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface SalonFilters {
  owner?: string;
  city?: string;
  isActive?: boolean;
  isVerified?: boolean;
  facilities?: SalonFacility[];
}

export interface BarberFilters {
  salon?: string;
  isActive?: boolean;
  isVerified?: boolean;
  specializations?: BarberSpecialization[];
}

export interface ServiceFilters {
  salon?: string;
  category?: ServiceCategory;
  isActive?: boolean;
}

export interface BookingFilters {
  customer?: string;
  salon?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  bookingType?: BookingType;
}

export interface PaymentFilters {
  customer?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
}

// Authentication Types

export interface SessionPayload {
  userId: string;
  phone: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  _id: string;
  name?: string;
  phone: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  notificationPreferences?: { inApp: boolean; push: boolean };
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  message?: string;
  error?: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  // In development only, may include otp for testing
  devOtp?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  user?: AuthUser;
  message?: string;
  error?: string;
}
