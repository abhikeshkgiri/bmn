'use client';

import { useState } from 'react';

export interface SalonUploadResult {
  url?: string;
  uploadToken?: string;
  uploaded?: boolean;
}

function isUploadResult(value: unknown): value is SalonUploadResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    (typeof result.url === 'string' && result.url.startsWith('/uploads/')) ||
    (typeof result.uploadToken === 'string' && /^[a-f\d-]{36}$/i.test(result.uploadToken)) ||
    result.uploaded === true
  );
}

interface SalonFileUploadProps {
  kind: 'aadhaar' | 'pan' | 'logo' | 'cover' | 'gallery' | 'service' | 'barber' | 'profile';
  label: string;
  accept: string;
  onUploaded: (result: SalonUploadResult) => void;
  previewUrl?: string;
  currentUploaded?: boolean;
  required?: boolean;
}

export default function SalonFileUpload({
  kind,
  label,
  accept,
  onUploaded,
  previewUrl,
  currentUploaded = false,
  required = false,
}: SalonFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError('');
    setUploaded(false);
    try {
      const body = new FormData();
      body.set('kind', kind);
      body.set('file', file);
      const response = await fetch('/api/salon/uploads', { method: 'POST', body });
      const result = await response.json();
      if (!response.ok || !result.success || !isUploadResult(result.data)) {
        throw new Error(result.error?.message || 'Unable to upload this file.');
      }
      onUploaded(result.data);
      setUploaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to upload this file.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">
        {label}
        <input
          className="mt-1 block w-full rounded-lg border border-border bg-white p-2 text-sm"
          type="file"
          accept={accept}
          required={required && !previewUrl && !uploaded}
          disabled={uploading}
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </label>
      {uploading ? <p role="status" className="text-sm text-foreground-secondary">Uploading…</p> : null}
      {uploaded || previewUrl || currentUploaded ? <p className="text-sm text-success-700">{uploaded ? 'Upload complete.' : 'Current file saved.'}</p> : null}
      {error ? <p role="alert" className="text-sm text-error-700">{error}</p> : null}
      {previewUrl ? <img src={previewUrl} alt={`${label} preview`} className="mt-2 max-h-24 max-w-48 rounded object-cover" /> : null}
    </div>
  );
}
