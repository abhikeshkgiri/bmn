import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createHomeServiceBooking, listHomeServiceRequests } from '@/services/home-service.service';
import { isRateLimited } from '@/lib/rate-limit';
import { z, ZodError } from 'zod';

const RequestSchema = z.object({
  salonId: z.string().regex(/^[a-f\d]{24}$/i),
  barberId: z.string().regex(/^[a-f\d]{24}$/i),
  serviceId: z.string().regex(/^[a-f\d]{24}$/i),
  addressId: z.string().regex(/^[a-f\d]{24}$/i),
  appointmentDate: z.string().datetime(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  customerNotes: z.string().max(500).optional(),
  couponCode: z.string().trim().min(3).max(50).optional(),
  loyaltyPoints: z.number().int().min(0).optional(),
}).strict();

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  try {
    return NextResponse.json({ success: true, data: await listHomeServiceRequests(user) });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Barber access required' } }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  if (isRateLimited(`home-service:${user._id}`, 5, 10 * 60 * 1000)) return NextResponse.json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many home-service requests' } }, { status: 429 });
  try {
    const input = RequestSchema.parse(await request.json());
    const booking = await createHomeServiceBooking({ ...input, currentUser: user });
    return NextResponse.json({ success: true, data: booking }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.issues } }, { status: 400 });
    if (error && typeof error === 'object' && 'code' in error) return NextResponse.json({ success: false, error }, { status: 400 });
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Unable to create home-service request' } }, { status: 500 });
  }
}
