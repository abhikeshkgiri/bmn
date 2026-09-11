import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import User from '@/models/User';
import { connectDB } from '@/lib/db';
import { z, ZodError } from 'zod';

const ProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().email().max(160).optional().or(z.literal('')),
  avatar: z.string().url().max(500).optional().or(z.literal('')),
  notificationPreferences: z.object({ inApp: z.boolean(), push: z.boolean() }).optional(),
}).strict();

export async function GET() {
  const current = await getCurrentUser();
  if (!current || current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  return NextResponse.json({ success: true, data: current });
}

export async function PATCH(request: NextRequest) {
  try {
    const current = await getCurrentUser();
    if (!current || current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const input = ProfileSchema.parse(await request.json()); await connectDB();
    const user = await User.findByIdAndUpdate(current._id, { $set: input }, { new: true, runValidators: true }).select('-__v');
    return NextResponse.json({ success: true, data: user });
  } catch (error) { if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.issues } }, { status: 400 }); return NextResponse.json({ success: false, error: 'Unable to update profile' }, { status: 500 }); }
}