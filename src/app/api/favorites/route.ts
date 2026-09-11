import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import Favorite from '@/models/Favorite';
import Salon from '@/models/Salon';
import Barber from '@/models/Barber';
import { connectDB } from '@/lib/db';
import { z, ZodError } from 'zod';

const FavoriteSchema = z.object({ targetType: z.enum(['SALON', 'BARBER']), targetId: z.string().regex(/^[a-f\d]{24}$/i) });

export async function GET() {
  const current = await getCurrentUser(); if (!current || current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  await connectDB(); const favorites = await Favorite.find({ customer: current._id }).sort({ createdAt: -1 }).lean();
  const salons = favorites.filter((item) => item.targetType === 'SALON').map((item) => item.target);
  const barbers = favorites.filter((item) => item.targetType === 'BARBER').map((item) => item.target);
  const [salonDocs, barberDocs] = await Promise.all([
    Salon.find({ _id: { $in: salons }, isActive: true }).lean(),
    Barber.find({ _id: { $in: barbers }, isActive: true }).lean(),
  ]);
  return NextResponse.json({ success: true, data: {
    salons: favorites.filter((item) => item.targetType === 'SALON').map((item) => ({ favoriteId: item._id, ...salonDocs.find((doc) => doc._id.toString() === item.target.toString()) })).filter((item) => item._id),
    barbers: favorites.filter((item) => item.targetType === 'BARBER').map((item) => ({ favoriteId: item._id, ...barberDocs.find((doc) => doc._id.toString() === item.target.toString()) })).filter((item) => item._id),
  } });
}

export async function POST(request: NextRequest) {
  try {
    const current = await getCurrentUser(); if (!current || current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const input = FavoriteSchema.parse(await request.json()); await connectDB();
    const Model = input.targetType === 'SALON' ? Salon : Barber;
    const exists = await Model.exists({ _id: input.targetId, isActive: true });
    if (!exists) return NextResponse.json({ success: false, error: 'Target not found' }, { status: 404 });
    const favorite = await Favorite.findOneAndUpdate({ customer: current._id, targetType: input.targetType, target: input.targetId }, { $setOnInsert: { customer: current._id, targetType: input.targetType, target: input.targetId } }, { upsert: true, new: true });
    return NextResponse.json({ success: true, data: favorite }, { status: 201 });
  } catch (error) { if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.issues } }, { status: 400 }); return NextResponse.json({ success: false, error: 'Unable to save favorite' }, { status: 500 }); }
}
