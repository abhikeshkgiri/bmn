/**
 * GET /api/salons/nearby
 * Find salons near a given location using geospatial queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Salon from '@/models/Salon';
import { LocationSearchSchema } from '@/validations/location.schema';
import { ZodError } from 'zod';
import { Types } from 'mongoose';

interface NearbySalon {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  address: {
    addressLine1: string;
    area?: string;
    city: string;
    state: string;
  };
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  contact: {
    phone: string;
  };
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  distance?: number; // in meters
}

interface NearbySalonResponse {
  success: boolean;
  data?: {
    salons: NearbySalon[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    center: {
      latitude: number;
      longitude: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<NearbySalonResponse>> {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate input
    const latitude = searchParams.get('lat');
    const longitude = searchParams.get('lng');
    const radius = searchParams.get('radius');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const serviceId = searchParams.get('serviceId');

    if (!latitude || !longitude || !radius) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMS',
            message: 'latitude (lat), longitude (lng), and radius are required',
          },
        },
        { status: 400 }
      );
    }

    const validatedInput = LocationSearchSchema.parse({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseFloat(radius),
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      serviceId: serviceId || undefined,
    });

    await connectDB();

    // Convert radius from km to meters
    const radiusInMeters = validatedInput.radius * 1000;

    // Geospatial query using MongoDB $near
    const salons = await Salon.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [validatedInput.longitude, validatedInput.latitude],
          },
          $maxDistance: radiusInMeters,
        },
      },
      isActive: true,
      ...(serviceId && { services: new Types.ObjectId(serviceId) }),
    })
      .select(
        '_id name slug description logo address location contact rating reviewCount isVerified'
      )
      .limit(validatedInput.limit * 2) // Fetch extra to ensure pagination
      .lean();

    // Calculate distances and sort
    const salonsWithDistance = salons.map((salon) => {
      const [salonLng, salonLat] = (salon as { location?: { coordinates?: [number, number] } }).location
        ?.coordinates ?? [0, 0];
      const distance = calculateDistance(
        validatedInput.latitude,
        validatedInput.longitude,
        salonLat,
        salonLng
      );

      return {
        ...salon,
        distance,
      };
    });

    // Sort by distance
    salonsWithDistance.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

    // Apply pagination
    const total = salonsWithDistance.length;
    const start = (validatedInput.page - 1) * validatedInput.limit;
    const paginatedSalons = salonsWithDistance.slice(start, start + validatedInput.limit);

    return NextResponse.json(
      {
        success: true,
        data: {
          salons: paginatedSalons as NearbySalon[],
          pagination: {
            page: validatedInput.page,
            limit: validatedInput.limit,
            total,
            totalPages: Math.ceil(total / validatedInput.limit),
          },
          center: {
            latitude: validatedInput.latitude,
            longitude: validatedInput.longitude,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
          },
        },
        { status: 400 }
      );
    }

    console.error('Nearby salons error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch nearby salons',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
