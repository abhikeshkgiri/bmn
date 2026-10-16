import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';
import {
  resolveSupportedCityFromPostalLocation,
  resolveSupportedStateFromPostalLocation,
} from '@/utils/indian-postal-location';

const PostalLookupSchema = z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code');
const PostalResponseSchema = z.array(z.object({
  Status: z.string(),
  PostOffice: z.array(z.object({
    District: z.string(),
    State: z.string(),
  }).passthrough()).nullable(),
}));

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { message: 'Authentication required' } }, { status: 401 });
  }
  if (user.role !== USER_ROLES.SALON_OWNER) {
    return NextResponse.json({ success: false, error: { message: 'Salon owner access required' } }, { status: 403 });
  }

  const parsedPostalCode = PostalLookupSchema.safeParse(request.nextUrl.searchParams.get('postalCode'));
  if (!parsedPostalCode.success) {
    return NextResponse.json({ success: false, error: { message: parsedPostalCode.error.issues[0]?.message || 'Invalid PIN code' } }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${parsedPostalCode.data}`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    if (!response.ok) {
      return NextResponse.json({ success: false, error: { message: 'PIN lookup is temporarily unavailable. Try again.' } }, { status: 502 });
    }

    const parsedResponse = PostalResponseSchema.safeParse(await response.json());
    if (!parsedResponse.success) throw new Error('Postal lookup returned an invalid response');
    const result = parsedResponse.data[0];
    const postOffice = result?.Status === 'Success' ? result.PostOffice?.[0] : undefined;
    if (!postOffice) {
      return NextResponse.json({ success: false, error: { message: 'No location was found for this PIN code.' } }, { status: 404 });
    }

    const location = resolveSupportedCityFromPostalLocation(postOffice.District, postOffice.State);
    return NextResponse.json({
      success: true,
      data: {
        city: location?.city || '',
        state: location?.state || resolveSupportedStateFromPostalLocation(postOffice.State),
        supported: Boolean(location),
      },
    });
  } catch (error) {
    console.error('Salon PIN lookup failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: { message: 'PIN lookup is temporarily unavailable. Try again.' } }, { status: 502 });
  }
}
