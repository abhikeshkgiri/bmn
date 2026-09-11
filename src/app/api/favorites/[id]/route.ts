import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import Favorite from '@/models/Favorite';
import { connectDB } from '@/lib/db';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser(); if (!current || current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  const { id } = await params; await connectDB(); const result = await Favorite.deleteOne({ _id: id, customer: current._id });
  if (!result.deletedCount) return NextResponse.json({ success: false, error: 'Favorite not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
