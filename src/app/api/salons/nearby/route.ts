/**
 * GET /api/salons/nearby
 * Find public salons near a given location using geospatial queries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Salon from '@/models/Salon';
import Service from '@/models/Service';
import { getSupportedSalonLocationFilter } from '@/constants/launch-cities';
import { APPROVED_SALON_STATUS_FILTER } from '@/utils/salon-approval';
import { buildActiveServiceSearchFilter } from '@/utils/service-search';
import { getSingleQueryParam, NearbySalonQuerySchema } from '@/validations/salon-discovery.schema';
import { ZodError } from 'zod';

interface NearbySalon {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  address: {
    area?: string;
    city: string;
    state: string;
  };
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  distance: number;
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
  };
  error?: {
    code: string;
    message: string;
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getNearbySalons(request: NextRequest): Promise<NextResponse<NearbySalonResponse>> {
  try {
    const validatedInput = request.method === 'POST'
      ? NearbySalonQuerySchema.parse(await request.json())
      : NearbySalonQuerySchema.parse({
          latitude: getSingleQueryParam(request.nextUrl.searchParams, 'lat'),
          longitude: getSingleQueryParam(request.nextUrl.searchParams, 'lng'),
          radius: getSingleQueryParam(request.nextUrl.searchParams, 'radius'),
          page: getSingleQueryParam(request.nextUrl.searchParams, 'page'),
          limit: getSingleQueryParam(request.nextUrl.searchParams, 'limit'),
          city: getSingleQueryParam(request.nextUrl.searchParams, 'city'),
          area: getSingleQueryParam(request.nextUrl.searchParams, 'area'),
          search: getSingleQueryParam(request.nextUrl.searchParams, 'search'),
          serviceId: getSingleQueryParam(request.nextUrl.searchParams, 'serviceId'),
          serviceSearch: getSingleQueryParam(request.nextUrl.searchParams, 'serviceSearch'),
          category: getSingleQueryParam(request.nextUrl.searchParams, 'category'),
        });

    await connectDB();

    const salonFilter = validatedInput.serviceId || validatedInput.serviceSearch || validatedInput.category
      ? {
          _id: {
            $in: await Service.distinct(
              'salon',
              buildActiveServiceSearchFilter({
                serviceId: validatedInput.serviceId,
                serviceSearch: validatedInput.serviceSearch,
                category: validatedInput.category,
              }),
            ).maxTimeMS(5000),
          },
        }
      : {};
    const supportedLocationFilter = getSupportedSalonLocationFilter(validatedInput.city);
    const salonTextFilter = validatedInput.search
      ? {
          $or: [
            { name: new RegExp(escapeRegex(validatedInput.search), 'i') },
            { description: new RegExp(escapeRegex(validatedInput.search), 'i') },
            { 'address.area': new RegExp(escapeRegex(validatedInput.search), 'i') },
          ],
        }
      : {};

    const [result] = await Salon.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [validatedInput.longitude, validatedInput.latitude],
          },
          distanceField: 'geoDistance',
          maxDistance: validatedInput.radius * 1000,
          spherical: true,
          key: 'location',
        },
      },
      {
        $match: {
          $and: [
            supportedLocationFilter || { _id: { $exists: false } },
            {
              isActive: true,
              isVerified: true,
              approvalStatus: APPROVED_SALON_STATUS_FILTER,
              ...(validatedInput.area && {
                'address.area': new RegExp(escapeRegex(validatedInput.area), 'i'),
              }),
              ...salonTextFilter,
              ...salonFilter,
            },
          ],
        },
      },
      {
        $facet: {
          salons: [
            { $skip: (validatedInput.page - 1) * validatedInput.limit },
            { $limit: validatedInput.limit },
            {
              $project: {
                _id: 1,
                name: 1,
                slug: 1,
                description: 1,
                logo: 1,
                address: {
                  area: '$address.area',
                  city: '$address.city',
                  state: '$address.state',
                },
                location: 1,
                rating: 1,
                reviewCount: 1,
                isVerified: 1,
                distance: '$geoDistance',
              },
            },
          ],
          metadata: [{ $count: 'total' }],
        },
      },
    ]).option({ maxTimeMS: 5000 });

    const salons = result?.salons ?? [];
    const total = result?.metadata?.[0]?.total ?? 0;
    return NextResponse.json(
      {
        success: true,
        data: {
          salons: salons as NearbySalon[],
          pagination: {
            page: validatedInput.page,
            limit: validatedInput.limit,
            total,
            totalPages: Math.ceil(total / validatedInput.limit),
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (
      error instanceof ZodError ||
      error instanceof SyntaxError ||
      error instanceof Error && error.message.startsWith('Duplicate query parameter:')
    ) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters' } },
        { status: 400 },
      );
    }

    console.error('Nearby salons request failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch nearby salons' } },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<NearbySalonResponse>> {
  return getNearbySalons(request);
}

export async function POST(request: NextRequest): Promise<NextResponse<NearbySalonResponse>> {
  return getNearbySalons(request);
}
