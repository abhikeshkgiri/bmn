import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import Favorite from '@/models/Favorite';
import { connectDB } from '@/lib/db';
import { USER_ROLES } from '@/constants/roles';
import { FavoriteIdSchema } from '@/validations/favorite.schema';
import { ZodError } from 'zod';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || current.role !== USER_ROLES.CUSTOMER) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in as a customer to manage favorites.' } },
      { status: 401 },
    );
  }

  try {
    const { id } = await params;
    const favoriteId = FavoriteIdSchema.parse(id);
    await connectDB();
    const result = await Favorite.deleteOne({ _id: favoriteId, customer: current._id }).maxTimeMS(5000);
    if (!result.deletedCount) {
      return NextResponse.json(
        { success: false, error: { code: 'FAVORITE_NOT_FOUND', message: 'Favorite not found.' } },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid favorite identifier.' } },
        { status: 400 },
      );
    }
    console.error('Favorite delete request failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json(
      { success: false, error: { code: 'FAVORITE_DELETE_FAILED', message: 'Unable to remove this favorite right now.' } },
      { status: 500 },
    );
  }
}
