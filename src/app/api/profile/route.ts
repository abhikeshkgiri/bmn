import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import User from '@/models/User';
import { connectDB } from '@/lib/db';
import { shouldUseDevAuthFallback, updateDevAuthUser } from '@/lib/dev-auth-store';
import { CustomerProfileUpdateSchema } from '@/validations/customer-profile.schema';
import { ZodError } from 'zod';

export async function GET() {
  try {
    const current = await getCurrentUser();
    if (!current) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    if (current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Customer account required' }, { status: 403 });
    return NextResponse.json({ success: true, data: current });
  } catch (error) {
    console.error('Customer profile fetch failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: 'Unable to load profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const current = await getCurrentUser();
    if (!current) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    if (current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Customer account required' }, { status: 403 });
    const input = CustomerProfileUpdateSchema.parse(await request.json());
    if (shouldUseDevAuthFallback()) {
      const user = updateDevAuthUser(current._id, input);
      if (!user) return NextResponse.json({ success: false, error: 'Development account is no longer available. Sign in again.' }, { status: 401 });
      return NextResponse.json({ success: true, data: user });
    }
    await connectDB();
    const user = await User.findByIdAndUpdate(current._id, { $set: input }, { new: true, runValidators: true })
      .select('name phone email avatar role isActive isVerified notificationPreferences');
    if (!user) return NextResponse.json({ success: false, error: 'Customer account not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Profile data is invalid',
          ...(error instanceof ZodError ? { details: error.issues } : {}),
        },
      }, { status: 400 });
    }
    console.error('Customer profile update failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: 'Unable to update profile' }, { status: 500 });
  }
}