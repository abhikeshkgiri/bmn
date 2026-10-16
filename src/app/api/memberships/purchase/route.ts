import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createMembershipOrder } from '@/services/membership.service';
import { z, ZodError } from 'zod';

const Schema = z.object({ planId: z.string().regex(/^[a-f\d]{24}$/i) });

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const { planId } = Schema.parse(await request.json());
    return NextResponse.json({ success: true, data: await createMembershipOrder(planId, user) });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.issues } }, { status: 400 });
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to create membership order' }, { status: 400 });
  }
}
