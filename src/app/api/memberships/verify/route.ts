import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { verifyMembershipPayment } from '@/services/membership.service';
import { z, ZodError } from 'zod';

const Schema = z.object({
  membershipId: z.string().regex(/^[a-f\d]{24}$/i),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const input = Schema.parse(await request.json());
    return NextResponse.json({ success: true, data: await verifyMembershipPayment(input.membershipId, input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature, user) });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.issues } }, { status: 400 });
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to verify membership payment' }, { status: 400 });
  }
}
