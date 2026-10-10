import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import CustomerAddress from '@/models/CustomerAddress';
import { connectDB } from '@/lib/db';
import { CustomerAddressSchema } from '@/validations/customer-profile.schema';
import { ZodError } from 'zod';
import mongoose from 'mongoose';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await getCurrentUser();
    if (!current || current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const input = CustomerAddressSchema.parse(await request.json());
    const { id } = await params;
    await connectDB();
    const session = await mongoose.startSession();
    let address;
    try {
      address = await session.withTransaction(async () => {
        const updated = await CustomerAddress.findOneAndUpdate(
          { _id: id, customer: current._id },
          input,
          { new: true, runValidators: true, session },
        );
        if (updated && input.isDefault) {
          await CustomerAddress.updateMany(
            { customer: current._id, _id: { $ne: updated._id } },
            { $set: { isDefault: false } },
            { session },
          );
        }
        return updated;
      });
    } finally {
      await session.endSession();
    }
    if (!address) return NextResponse.json({ success: false, error: 'Address not found' }, { status: 404 });
    return NextResponse.json({
      success: true,
      data: {
        _id: address._id.toString(),
        label: address.label,
        name: address.name,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        area: address.area,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        latitude: address.latitude,
        longitude: address.longitude,
        isDefault: address.isDefault,
        createdAt: address.createdAt,
        updatedAt: address.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error instanceof ZodError ? error.issues : [] } }, { status: 400 });
    }
    console.error('Customer address update failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: 'Unable to update address' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await getCurrentUser();
    if (!current || current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const result = await CustomerAddress.deleteOne({ _id: id, customer: current._id });
    if (!result.deletedCount) return NextResponse.json({ success: false, error: 'Address not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Customer address deletion failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: 'Unable to delete address' }, { status: 500 });
  }
}
