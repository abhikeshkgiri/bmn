import { NextRequest, NextResponse } from 'next/server';
import { USER_ROLES } from '@/constants/roles';
import { getCurrentUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getSalonDocumentMediaType, readEncryptedSalonDocument } from '@/lib/salon-uploads';
import Salon from '@/models/Salon';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  const kindValue = request.nextUrl.searchParams.get('kind') || '';
  if (kindValue !== 'aadhaar' && kindValue !== 'pan') {
    return NextResponse.json({ success: false, error: { code: 'INVALID_DOCUMENT', message: 'Choose an Aadhaar or PAN document.' } }, { status: 400 });
  }
  const isAdmin = user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN;
  const salonId = request.nextUrl.searchParams.get('salonId');
  if (isAdmin && !salonId) {
    return NextResponse.json({ success: false, error: { code: 'SALON_REQUIRED', message: 'A salon id is required.' } }, { status: 400 });
  }
  if (isAdmin && salonId && !/^[a-f\d]{24}$/i.test(salonId)) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_SALON_ID', message: 'The salon id is invalid.' } }, { status: 400 });
  }
  if (!isAdmin && user.role !== USER_ROLES.SALON_OWNER) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Salon owner or administrator access required' } }, { status: 403 });
  }

  try {
    await connectDB();
    const salon = await Salon.findOne(isAdmin ? { _id: salonId } : { owner: user._id })
      .select('+aadhaarDocument +panDocument')
      .lean();
    if (!salon) {
      return NextResponse.json({ success: false, error: { code: 'SALON_NOT_FOUND', message: 'Salon was not found.' } }, { status: 404 });
    }
    const documentKey = kindValue === 'aadhaar' ? salon.aadhaarDocument : salon.panDocument;
    if (!documentKey) {
      return NextResponse.json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: `${kindValue.toUpperCase()} document has not been uploaded.` } }, { status: 404 });
    }
    const metadata = getSalonDocumentMediaType(documentKey);
    const contents = await readEncryptedSalonDocument(documentKey);
    return new NextResponse(new Uint8Array(contents), {
      status: 200,
      headers: {
        'Content-Type': metadata.contentType,
        'Content-Disposition': `attachment; filename="${metadata.filename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('SALON_DOCUMENT_ENCRYPTION_KEY')) {
      return NextResponse.json({ success: false, error: { code: 'DOCUMENT_ENCRYPTION_NOT_CONFIGURED', message: 'Document encryption is not configured on this server.' } }, { status: 503 });
    }
    console.error(`Salon ${kindValue} document retrieval failed:`, error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: { code: 'DOCUMENT_UNAVAILABLE', message: 'Unable to retrieve this document.' } }, { status: 500 });
  }
}
