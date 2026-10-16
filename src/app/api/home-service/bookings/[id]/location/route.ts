import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { updateBarberLocation } from '@/services/home-service.service';
import { z, ZodError } from 'zod';

const LocationSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  try {
    const location = LocationSchema.parse(await request.json());
    return NextResponse.json({ success: true, data: await updateBarberLocation(user, (await params).id, location) });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.issues } }, { status: 400 });
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Unable to update location' } }, { status: 400 });
  }
}
