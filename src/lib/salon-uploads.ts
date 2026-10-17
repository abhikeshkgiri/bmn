import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import SalonUpload from '@/models/SalonUpload';

export type SalonUploadKind = 'aadhaar' | 'pan' | 'logo' | 'cover' | 'gallery' | 'service' | 'barber' | 'profile';
export type SalonIdentityKind = Extract<SalonUploadKind, 'aadhaar' | 'pan'>;
export type SalonImageKind = Exclude<SalonUploadKind, SalonIdentityKind>;

const MAX_IDENTITY_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function isSalonUploadKind(value: string): value is SalonUploadKind {
  return ['aadhaar', 'pan', 'logo', 'cover', 'gallery', 'service', 'barber', 'profile'].includes(value);
}

export function isSalonIdentityKind(value: SalonUploadKind): value is SalonIdentityKind {
  return value === 'aadhaar' || value === 'pan';
}

export function getSalonUploadLimit(kind: SalonUploadKind): number {
  return isSalonIdentityKind(kind) ? MAX_IDENTITY_BYTES : MAX_IMAGE_BYTES;
}

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.SALON_DOCUMENT_ENCRYPTION_KEY?.trim();
  if (!encodedKey) throw new Error('SALON_DOCUMENT_ENCRYPTION_KEY is not configured');
  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32) throw new Error('SALON_DOCUMENT_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  return key;
}

function encryptDocument(contents: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(contents), cipher.final()]);
  return Buffer.concat([Buffer.from('BMN1'), iv, cipher.getAuthTag(), encrypted]);
}

function decryptDocument(contents: Buffer): Buffer {
  if (contents.length < 32 || contents.subarray(0, 4).toString() !== 'BMN1') {
    throw new Error('Stored identity document has an invalid encrypted format');
  }
  const iv = contents.subarray(4, 16);
  const authTag = contents.subarray(16, 32);
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(contents.subarray(32)), decipher.final()]);
}

export function detectAllowedUploadType(
  contents: Buffer,
  kind: SalonUploadKind,
): { extension: 'pdf' | 'jpg' | 'png' | 'webp'; contentType: string } | null {
  const detected = contents.subarray(0, 5).toString('hex');
  if (detected.startsWith('ffd8ff')) return { extension: 'jpg', contentType: 'image/jpeg' };
  if (detected.startsWith('89504e470d')) return { extension: 'png', contentType: 'image/png' };
  if (contents.subarray(0, 5).toString() === '%PDF-') {
    return isSalonIdentityKind(kind) ? { extension: 'pdf', contentType: 'application/pdf' } : null;
  }
  if (
    !isSalonIdentityKind(kind) &&
    contents.subarray(0, 4).toString() === 'RIFF' &&
    contents.subarray(8, 12).toString() === 'WEBP'
  ) {
    return { extension: 'webp', contentType: 'image/webp' };
  }
  return null;
}

export function getSalonUploadFolderName(salonName: string, salonId: string): string {
  const safeName = salonName.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${safeName || 'salon'}-${salonId}`;
}

export async function saveSalonUpload(options: {
  ownerId: string;
  salon?: { _id: string; name: string } | null;
  kind: SalonUploadKind;
  contents: Buffer;
  contentType: string;
}): Promise<{ url: string } | { uploadToken: string }> {
  const fileType = detectAllowedUploadType(options.contents, options.kind);
  if (!fileType) throw new Error('Unsupported file type. Use PDF, JPG, or PNG for identity documents; use JPG, PNG, or WebP for images.');
  if (options.contentType && options.contentType !== 'application/octet-stream' && options.contentType !== fileType.contentType) {
    throw new Error('File content does not match its declared type');
  }
  const token = randomUUID();
  const ownerId = options.ownerId.replace(/[^a-f\d]/gi, '');
  const hasSalon = Boolean(options.salon);

  if (isSalonIdentityKind(options.kind)) {
    await SalonUpload.create({
      _id: token,
      ownerId,
      salonId: options.salon?._id,
      kind: options.kind,
      contentType: fileType.contentType,
      data: encryptDocument(options.contents),
      isPublic: false,
    });
    const documentKey = `${options.kind}-${token}.${fileType.extension}.enc`;
    if (options.salon) return { url: documentKey };
    return { uploadToken: token };
  }

  await SalonUpload.create({
    _id: token,
    ownerId,
    salonId: options.salon?._id,
    kind: options.kind,
    contentType: fileType.contentType,
    data: options.contents,
    isPublic: hasSalon || options.kind === 'profile',
  });
  return { url: `/api/uploads/${token}` };
}

export async function finalizeStagedIdentityDocument(
  ownerId: string,
  salonId: string,
  kind: SalonIdentityKind,
  token: string,
): Promise<string> {
  if (!/^[a-f\d-]{36}$/i.test(token)) throw new Error(`Invalid ${kind} upload token`);
  if (!/^[a-f\d]{24}$/i.test(ownerId) || !/^[a-f\d]{24}$/i.test(salonId)) throw new Error('Invalid salon identity');
  const upload = await SalonUpload.findOneAndUpdate(
    { _id: token, ownerId, kind, isPublic: false },
    { $set: { salonId } },
  );
  if (!upload) throw new Error(`The uploaded ${kind} document was not found`);
  return `${kind}-${token}.${upload.contentType === 'application/pdf' ? 'pdf' : upload.contentType === 'image/jpeg' ? 'jpg' : 'png'}.enc`;
}

export async function finalizeStagedSalonImage(ownerId: string, salonId: string, value: string): Promise<string> {
  const match = value.match(/^\/api\/uploads\/([a-f\d-]{36})$/i);
  if (!match) return value;
  if (!/^[a-f\d]{24}$/i.test(ownerId) || !/^[a-f\d]{24}$/i.test(salonId)) throw new Error('Invalid salon identity');
  const upload = await SalonUpload.findOneAndUpdate(
    { _id: match[1], ownerId, kind: { $in: ['logo', 'cover', 'gallery', 'service', 'barber'] }, isPublic: false },
    { $set: { salonId, isPublic: true } },
  );
  if (!upload) throw new Error('The staged salon image was not found');
  return value;
}

export async function readEncryptedSalonDocument(documentKey: string): Promise<Buffer> {
  const match = documentKey.match(/(?:^|\/)(aadhaar|pan)-([a-f\d-]{36})\.(?:pdf|jpg|png)\.enc$/i);
  if (!match) throw new Error('Invalid identity document reference');
  const upload = await SalonUpload.findOne({ _id: match[2], kind: match[1] }).select('+data').lean();
  if (!upload) throw new Error('Stored identity document was not found');
  return decryptDocument(upload.data);
}

export function getSalonDocumentMediaType(documentKey: string): { contentType: string; filename: string } {
  const extension = documentKey.match(/\.(pdf|jpg|png)\.enc$/i)?.[1]?.toLowerCase();
  const kind = documentKey.split(/[\\/]/).pop()?.split('-')[0];
  if (kind !== 'aadhaar' && kind !== 'pan') throw new Error('Stored identity document has an invalid type');
  const contentType = extension === 'pdf' ? 'application/pdf' : extension === 'jpg' ? 'image/jpeg' : extension === 'png' ? 'image/png' : null;
  if (!contentType || !extension) throw new Error('Stored identity document has an invalid file type');
  return { contentType, filename: `${kind}.${extension}` };
}
