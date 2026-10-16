import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type SalonUploadKind = 'aadhaar' | 'pan' | 'logo' | 'cover' | 'gallery' | 'service' | 'barber' | 'profile';
export type SalonIdentityKind = Extract<SalonUploadKind, 'aadhaar' | 'pan'>;
export type SalonImageKind = Exclude<SalonUploadKind, SalonIdentityKind>;

const PRIVATE_ROOT = path.join(process.cwd(), 'private-uploads');
const PUBLIC_ROOT = path.join(process.cwd(), 'public', 'uploads');
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

async function persistEncryptedDocument(destination: string, contents: Buffer): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, encryptDocument(contents), { flag: 'wx', mode: 0o600 });
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
  const filename = `${token}.${fileType.extension}`;
  const ownerId = options.ownerId.replace(/[^a-f\d]/gi, '');

  if (isSalonIdentityKind(options.kind)) {
    const encryptedFilename = `${options.kind}-${token}.${fileType.extension}.enc`;
    if (options.salon) {
      const folder = getSalonUploadFolderName(options.salon.name, options.salon._id);
      const documentKey = path.join(folder, encryptedFilename);
      await persistEncryptedDocument(path.join(PRIVATE_ROOT, documentKey), options.contents);
      return { url: documentKey };
    }
    await persistEncryptedDocument(path.join(PRIVATE_ROOT, '.staging', ownerId, encryptedFilename), options.contents);
    return { uploadToken: token };
  }

  const folder = options.salon
    ? getSalonUploadFolderName(options.salon.name, options.salon._id)
    : options.kind === 'profile'
      ? path.join('profiles', ownerId)
      : path.join('.staging', ownerId);
  const relativeImagePath = path.join(folder, options.kind, filename);
  const destination = path.join(PUBLIC_ROOT, relativeImagePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, options.contents, { flag: 'wx', mode: 0o644 });
  return { url: `/uploads/${relativeImagePath.split(path.sep).join('/')}` };
}

export async function finalizeStagedIdentityDocument(
  ownerId: string,
  salonId: string,
  salonName: string,
  kind: SalonIdentityKind,
  token: string,
): Promise<string> {
  if (!/^[a-f\d-]{36}$/i.test(token)) throw new Error(`Invalid ${kind} upload token`);
  if (!/^[a-f\d]{24}$/i.test(ownerId) || !/^[a-f\d]{24}$/i.test(salonId)) throw new Error('Invalid salon identity');
  const extensions = ['pdf', 'jpg', 'png'];
  let sourceFile: string | undefined;
  for (const extension of extensions) {
    const candidate = path.join(PRIVATE_ROOT, '.staging', ownerId, `${kind}-${token}.${extension}.enc`);
    try {
      await readFile(candidate);
      sourceFile = candidate;
      break;
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
  }
  if (!sourceFile) throw new Error(`The uploaded ${kind} document was not found`);
  const targetKey = path.join(getSalonUploadFolderName(salonName, salonId), path.basename(sourceFile));
  const target = path.join(PRIVATE_ROOT, targetKey);
  await mkdir(path.dirname(target), { recursive: true });
  await rename(sourceFile, target);
  return targetKey;
}

export async function finalizeStagedSalonImage(ownerId: string, salonId: string, salonName: string, value: string): Promise<string> {
  const prefix = `/uploads/.staging/${ownerId}/`;
  if (!value.startsWith(prefix)) return value;
  const stagedRelativePath = value.slice('/uploads/'.length);
  const segments = stagedRelativePath.split('/');
  if (segments.length !== 4 || segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Invalid staged salon image reference');
  }
  const [staging, stagedOwnerId, kind, filename] = segments;
  if (staging !== '.staging' || stagedOwnerId !== ownerId || !['logo', 'cover', 'gallery', 'service', 'barber'].includes(kind) || !/^[a-f\d-]{36}\.(jpg|png|webp)$/i.test(filename)) {
    throw new Error('Invalid staged salon image reference');
  }
  const source = path.join(PUBLIC_ROOT, ...segments);
  const targetRelative = path.join(getSalonUploadFolderName(salonName, salonId), kind, filename);
  const target = path.join(PUBLIC_ROOT, targetRelative);
  await mkdir(path.dirname(target), { recursive: true });
  await rename(source, target);
  return `/uploads/${targetRelative.split(path.sep).join('/')}`;
}

export async function readEncryptedSalonDocument(documentKey: string): Promise<Buffer> {
  if (path.isAbsolute(documentKey) || documentKey.split(/[\\/]/).some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Invalid identity document reference');
  }
  const fullPath = path.resolve(PRIVATE_ROOT, documentKey);
  if (!fullPath.startsWith(`${PRIVATE_ROOT}${path.sep}`)) throw new Error('Invalid identity document reference');
  return decryptDocument(await readFile(fullPath));
}

export function getSalonDocumentMediaType(documentKey: string): { contentType: string; filename: string } {
  const extension = documentKey.match(/\.(pdf|jpg|png)\.enc$/i)?.[1]?.toLowerCase();
  const kind = path.basename(documentKey).split('-')[0];
  if (kind !== 'aadhaar' && kind !== 'pan') throw new Error('Stored identity document has an invalid type');
  const contentType = extension === 'pdf' ? 'application/pdf' : extension === 'jpg' ? 'image/jpeg' : extension === 'png' ? 'image/png' : null;
  if (!contentType || !extension) throw new Error('Stored identity document has an invalid file type');
  return { contentType, filename: `${kind}.${extension}` };
}
