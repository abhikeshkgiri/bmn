import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import CustomerAddress from '@/models/CustomerAddress';
import { connectDB } from '@/lib/db';
import { z, ZodError } from 'zod';

const AddressSchema = z.object({
  label: z.string().trim().min(1).max(40), name: z.string().trim().min(2).max(100), phone: z.string().trim().max(20).optional(),
  addressLine1: z.string().trim().min(2).max(200), addressLine2: z.string().trim().max(200).optional(), area: z.string().trim().max(100).optional(),
  city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(80), postalCode: z.string().trim().min(3).max(12),
  latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), isDefault: z.boolean().default(false),
});

async function user() { const current = await getCurrentUser(); return current && current.role === 'CUSTOMER' ? current : null; }

export async function GET() {
  const current = await user(); if (!current) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  await connectDB(); return NextResponse.json({ success: true, data: await CustomerAddress.find({ customer: current._id }).sort({ isDefault: -1, createdAt: -1 }) });
}

export async function POST(request: NextRequest) {
  try {
    const current = await user(); if (!current) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const input = AddressSchema.parse(await request.json()); await connectDB();
    if (input.isDefault) await CustomerAddress.updateMany({ customer: current._id }, { $set: { isDefault: false } });
    const address = await CustomerAddress.create({ ...input, customer: current._id });
    return NextResponse.json({ success: true, data: address }, { status: 201 });
  } catch (error) { if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.issues } }, { status: 400 }); return NextResponse.json({ success: false, error: 'Unable to create address' }, { status: 500 }); }
}
