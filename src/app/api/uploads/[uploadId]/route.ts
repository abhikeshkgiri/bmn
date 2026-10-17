import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import SalonUpload from '@/models/SalonUpload';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const { uploadId } = await params;
  if (!/^[a-f\d-]{36}$/i.test(uploadId)) {
    return NextResponse.json({ success: false, error: { code: 'UPLOAD_NOT_FOUND', message: 'Image not found.' } }, { status: 404 });
  }

  try {
    await connectDB();
    const upload = await SalonUpload.findById(uploadId).select('+data').lean();
    if (!upload || !['logo', 'cover', 'gallery', 'service', 'barber', 'profile'].includes(upload.kind)) {
      return NextResponse.json({ success: false, error: { code: 'UPLOAD_NOT_FOUND', message: 'Image not found.' } }, { status: 404 });
    }
    if (!upload.isPublic) {
      const user = await getCurrentUser();
      if (!user || user._id.toString() !== upload.ownerId) {
        return NextResponse.json({ success: false, error: { code: 'UPLOAD_NOT_FOUND', message: 'Image not found.' } }, { status: 404 });
      }
    }

    return new NextResponse(new Uint8Array(upload.data), {
      status: 200,
      headers: {
        'Content-Type': upload.contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': upload.isPublic ? 'public, max-age=31536000, immutable' : 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Image retrieval failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: { code: 'UPLOAD_UNAVAILABLE', message: 'Unable to retrieve this image.' } }, { status: 500 });
  }
}
