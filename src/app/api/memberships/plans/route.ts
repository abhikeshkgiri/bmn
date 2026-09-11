import { NextResponse } from 'next/server';
import { getPlans } from '@/services/membership.service';

export async function GET() {
  return NextResponse.json({ success: true, data: await getPlans() });
}
