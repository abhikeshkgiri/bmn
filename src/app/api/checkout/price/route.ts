import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { calculateCheckoutPrice } from '@/services/pricing.service';
import { z, ZodError } from 'zod';

const PriceSchema = z.object({
  salonId: z.string().regex(/^[a-f\d]{24}$/i),
  serviceId: z.string().regex(/^[a-f\d]{24}$/i),
  couponCode: z.string().trim().min(3).max(50).optional(),
  loyaltyPoints: z.number().int().min(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const input = PriceSchema.parse(await request.json());
    const price = await calculateCheckoutPrice({ ...input, customerId: user._id });
    return NextResponse.json({ success: true, data: price });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.issues } }, { status: 400 });
    return NextResponse.json({ success: false, error: { code: 'PRICE_ERROR', message: error instanceof Error ? error.message : 'Unable to calculate price' } }, { status: 400 });
  }
}
