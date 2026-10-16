import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import CustomerAddress from '@/models/CustomerAddress';
import { connectDB } from '@/lib/db';
import { CustomerAddressSchema } from '@/validations/customer-profile.schema';
import { ZodError } from 'zod';
import mongoose from 'mongoose';

async function user() { const current = await getCurrentUser(); return current && current.role === 'CUSTOMER' ? current : null; }

export async function GET() {
  try {
    const current = await user();
    if (!current) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    await connectDB();
    const addresses = await CustomerAddress.find({ customer: current._id })
      .select('label name phone addressLine1 addressLine2 area city state postalCode latitude longitude isDefault createdAt updatedAt')
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: addresses });
  } catch (error) {
    console.error('Customer address list failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: 'Unable to load saved addresses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const current = await user();
    if (!current) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const input = CustomerAddressSchema.parse(await request.json());
    await connectDB();
    const session = await mongoose.startSession();
    let address;
    try {
      address = await session.withTransaction(async () => {
        const [created] = await CustomerAddress.create([{ ...input, customer: current._id }], { session });
        if (input.isDefault) {
          await CustomerAddress.updateMany(
            { customer: current._id, _id: { $ne: created._id } },
            { $set: { isDefault: false } },
            { session },
          );
        }
        return created;
      });
    } finally {
      await session.endSession();
    }
    if (!address) throw new Error('Address creation transaction did not return a document');
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
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error instanceof ZodError ? error.issues : [] } }, { status: 400 });
    }
    console.error('Customer address creation failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: 'Unable to create address' }, { status: 500 });
  }
}
