import { NextRequest, NextResponse } from 'next/server';
import { USER_ROLES } from '@/constants/roles';
import { connectDB } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  getSalonUploadLimit,
  isSalonIdentityKind,
  isSalonUploadKind,
  saveSalonUpload,
} from '@/lib/salon-uploads';
import Salon from '@/models/Salon';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }
  const canUploadSalonFiles = user.role === USER_ROLES.SALON_OWNER;
  const canUploadProfileImage =
    user.role === USER_ROLES.CUSTOMER || user.role === USER_ROLES.BARBER;
  if (!canUploadSalonFiles && !canUploadProfileImage) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Salon owner access required' } }, { status: 403 });
  }

  try {
    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (declaredLength > 11 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'Upload exceeds the maximum file size.' } }, { status: 413 });
    }
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ success: false, error: { code: 'INVALID_UPLOAD', message: 'The upload request is not valid multipart form data.' } }, { status: 400 });
    }
    const kindValue = form.get('kind');
    const file = form.get('file');
    if (typeof kindValue !== 'string' || !isSalonUploadKind(kindValue) || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_UPLOAD', message: 'Choose a supported file and upload category.' } }, { status: 400 });
    }
    if (!canUploadSalonFiles && kindValue !== 'profile') {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only account profile photos can be uploaded for this account.' } }, { status: 403 });
    }
    if (!file.size || file.size > getSalonUploadLimit(kindValue)) {
      return NextResponse.json({ success: false, error: { code: 'FILE_TOO_LARGE', message: `File must be smaller than ${getSalonUploadLimit(kindValue) / (1024 * 1024)} MB.` } }, { status: 413 });
    }

    await connectDB();
    const salon = await Salon.findOne({ owner: user._id }).select('_id name').lean();
    const result = await saveSalonUpload({
      ownerId: user._id.toString(),
      salon: salon ? { _id: salon._id.toString(), name: salon.name } : null,
      kind: kindValue,
      contents: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });

    if (salon && isSalonIdentityKind(kindValue) && 'url' in result) {
      const field = kindValue === 'aadhaar' ? 'aadhaarDocument' : 'panDocument';
      await Salon.updateOne(
        { _id: salon._id, owner: user._id },
        { $set: { [field]: result.url } },
      );
      return NextResponse.json({ success: true, data: { uploaded: true } });
    }
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('SALON_DOCUMENT_ENCRYPTION_KEY')) {
      return NextResponse.json({ success: false, error: { code: 'DOCUMENT_ENCRYPTION_NOT_CONFIGURED', message: 'Secure document storage is not configured. Add SALON_DOCUMENT_ENCRYPTION_KEY and restart the server.' } }, { status: 503 });
    }
    if (message.startsWith('Unsupported file type') || message.includes('does not match its declared type')) {
      return NextResponse.json({ success: false, error: { code: 'UNSUPPORTED_FILE', message } }, { status: 415 });
    }
    console.error('Salon upload failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: { code: 'UPLOAD_FAILED', message: 'Unable to save this file. Please retry.' } }, { status: 500 });
  }
}
