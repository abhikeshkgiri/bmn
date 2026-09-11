import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import CustomerAddress from '@/models/CustomerAddress';
import { connectDB } from '@/lib/db';
import { z, ZodError } from 'zod';

const AddressSchema = z.object({
  label: z.string().trim().min(1).max(40), name: z.string().trim().min(2).max(100), phone: z.string().trim().max(20).optional(), addressLine1: z.string().trim().min(2).max(200), addressLine2: z.string().trim().max(200).optional(), area: z.string().trim().max(100).optional(), city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(80), postalCode: z.string().trim().min(3).max(12), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), isDefault: z.boolean().default(false),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await getCurrentUser(); if (!current || current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const input = AddressSchema.parse(await request.json()); const { id } = await params; await connectDB();
    if (input.isDefault) await CustomerAddress.updateMany({ customer: current._id }, { $set: { isDefault: false } });
    const address = await CustomerAddress.findOneAndUpdate({ _id: id, customer: current._id }, input, { new: true, runValidators: true });
    if (!address) return NextResponse.json({ success: false, error: 'Address not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: address });
  } catch (error) { if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.issues } }, { status: 400 }); return NextResponse.json({ success: false, error: 'Unable to update address' }, { status: 500 }); }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser(); if (!current || current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  const { id } = await params; await connectDB(); const result = await CustomerAddress.deleteOne({ _id: id, customer: current._id });
  if (!result.deletedCount) return NextResponse.json({ success: false, error: 'Address not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
