'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AdminSalon {
  _id: string;
  name: string;
  slug: string;
  salonType?: string;
  description?: string;
  logo?: string | null;
  coverImage?: string | null;
  images?: string[];
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    area?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  contact?: { phone?: string; email?: string; website?: string };
  socialLinks?: { instagram?: string; facebook?: string; youtube?: string };
  facilities?: string[];
  openingHours?: Record<string, { isOpen: boolean; openTime?: string; closeTime?: string }>;
  services?: Array<{ _id: string; name: string; description?: string; category?: string; price: number; duration: number; isActive: boolean }>;
  barbers?: Array<{ _id: string; name: string; title?: string; profileImage?: string; bio?: string; experienceYears?: number; specializations?: string[]; isVerified: boolean; isActive: boolean; user?: { name?: string; phone?: string } | null }>;
  owner?: { name?: string; phone?: string; email?: string; role?: string };
  isActive: boolean;
  isVerified: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  identityDocuments?: { aadhaar: boolean; pan: boolean };
  rejectionReason?: string | null;
  createdAt: string;
}

interface AuditEntry {
  action: string;
  metadata?: { reason?: string };
  createdAt: string;
  actorId?: { name?: string; role?: string };
}

const statusLabel = (salon: AdminSalon) => {
  if (salon.approvalStatus) return salon.approvalStatus;
  return salon.isVerified ? 'APPROVED' : 'PENDING';
};

export default function AdminSalonsPage() {
  const [salons, setSalons] = useState<AdminSalon[]>([]);
  const [selected, setSelected] = useState<AdminSalon | null>(null);
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('pending');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [reason, setReason] = useState('');

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: '10', status });
      if (search.trim()) params.set('search', search.trim());
      if (city.trim()) params.set('city', city.trim());
      if (from) params.set('from', from);
      if (to) params.set('to', `${to}T23:59:59.999`);
      const response = await fetch(`/api/admin/salons?${params}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || 'Unable to load salon applications.');
      setSalons(Array.isArray(result.data) ? result.data : []);
      setPages(Math.max(1, result.pagination?.pages || 1));
      setPage(targetPage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load salon applications.');
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, [city, from, search, status, to]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(1), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function openDetails(salon: AdminSalon) {
    setSelected(salon);
    setHistory([]);
    setReason(salon.rejectionReason || '');
    try {
      const response = await fetch(`/api/admin/salons/${encodeURIComponent(salon._id)}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || 'Unable to load application details.');
      setSelected(result.data.salon);
      setHistory(Array.isArray(result.data.history) ? result.data.history : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load application details.');
    }
  }

  async function decide(isVerified: boolean) {
    if (!selected) return;
    if (!isVerified && !reason.trim()) {
      setError('Enter a rejection reason before rejecting the application.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/salons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: selected._id,
          isVerified,
          ...(isVerified ? {} : { reason: reason.trim() }),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || 'Unable to update application.');
      setNotice(isVerified ? 'Salon approved. It may be published only after server-side eligibility checks.' : 'Salon rejected; the reason was recorded.');
      setSelected(result.data);
      await load(page);
      await openDetails(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update application.');
    } finally {
      setSaving(false);
    }
  }

  async function changeSalonStatus(salon: AdminSalon) {
    const nextIsActive = !salon.isActive;
    const action = nextIsActive ? 'reactivate' : 'deactivate';
    const confirmation = nextIsActive
      ? `Reactivate ${salon.name}? Only approved salons in supported locations can be reactivated.`
      : `Deactivate ${salon.name}? It will no longer accept new bookings. Existing booking, payment, and audit history will be preserved.`;
    if (!window.confirm(confirmation)) return;

    setStatusSavingId(salon._id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/salons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', salonId: salon._id, isActive: nextIsActive }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || `Unable to ${action} this salon.`);
      }
      if (selected?._id === salon._id) setSelected(result.data);
      setNotice(`${salon.name} was ${nextIsActive ? 'reactivated' : 'deactivated'}. History was preserved.`);
      await load(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Unable to ${action} this salon.`);
    } finally {
      setStatusSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Salon applications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Input label="Search salons" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Input label="City" value={city} onChange={(event) => setCity(event.target.value)} />
            <label className="block text-sm font-medium">Status
              <select className="mt-1 w-full rounded-lg border border-border bg-white p-3" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="pending">Pending review</option>
                <option value="active">Approved / active</option>
                <option value="rejected">Rejected</option>
                <option value="inactive">Inactive</option>
                <option value="">All</option>
              </select>
            </label>
            <Input label="Submitted from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input label="Submitted to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <Button type="button" onClick={() => void load(1)}>Apply filters</Button>
        </CardContent>
      </Card>

      {notice ? <p role="status" className="rounded-lg bg-success-50 p-3 text-sm text-success-700">{notice}</p> : null}
      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-error-50 p-3 text-sm text-error-700">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void load(page)}>Retry</Button>
        </div>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Review queue</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p role="status">Loading salon applications…</p> : salons.length === 0 ? <p className="text-sm text-neutral-600">No salon applications match these filters.</p> : (
            <div className="space-y-3">
              {salons.map((salon) => (
                <article key={salon._id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold">{salon.name}</h2>
                    {salon.salonType && <p className="text-xs uppercase text-neutral-500">{salon.salonType.replace(/_/g, ' ')}</p>}
                    <p className="text-sm text-neutral-600">{[salon.address?.area, salon.address?.city, salon.address?.state].filter(Boolean).join(', ') || 'Location incomplete'}</p>
                    <p className="text-xs text-neutral-500">Submitted {new Date(salon.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusLabel(salon) === 'APPROVED' ? 'success' : statusLabel(salon) === 'REJECTED' ? 'error' : 'warning'}>
                      {statusLabel(salon)}
                    </Badge>
                    <Badge variant={salon.isVerified ? 'success' : 'warning'}>{salon.isVerified ? 'Verified' : 'Unverified'}</Badge>
                    <Badge variant={salon.isActive ? 'success' : 'warning'}>{salon.isActive ? 'Active' : 'Inactive'}</Badge>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => void openDetails(salon)}>Review details</Button>
                      <Button
                        type="button"
                        variant={salon.isActive ? 'outline' : 'secondary'}
                        size="sm"
                        disabled={statusSavingId !== null || saving || (!salon.isActive && (!salon.isVerified || statusLabel(salon) !== 'APPROVED'))}
                        title={!salon.isActive && (!salon.isVerified || statusLabel(salon) !== 'APPROVED') ? 'Approve and verify this salon before reactivating it.' : undefined}
                        onClick={() => void changeSalonStatus(salon)}
                      >
                        {statusSavingId === salon._id ? 'Saving…' : salon.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
              <div className="flex items-center justify-between pt-3">
                <Button type="button" variant="outline" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>Previous</Button>
                <span className="text-sm text-neutral-600">Page {page} of {pages}</span>
                <Button type="button" variant="outline" disabled={page >= pages || loading} onClick={() => void load(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle>Review: {selected.name}</CardTitle>
            <p className="text-sm text-neutral-600">Approval: {statusLabel(selected)} · {selected.isVerified ? 'Verified' : 'Unverified'} · {selected.isActive ? 'Active' : 'Inactive'} · Submitted {new Date(selected.createdAt).toLocaleString()}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {(selected.coverImage || selected.logo) ? (
              <img className="max-h-64 w-full rounded-xl object-cover" src={selected.coverImage || selected.logo || ''} alt={`${selected.name} salon`} />
            ) : <div className="rounded-xl bg-neutral-100 p-8 text-center text-sm text-neutral-500">No salon photos submitted.</div>}
            {selected.images?.length ? (
              <div className="flex flex-wrap gap-3">{selected.images.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${selected.name} gallery ${index + 1}`} className="h-24 w-24 rounded-lg object-cover" />)}</div>
            ) : null}
            <div className="grid gap-5 md:grid-cols-2">
              <section>
                <h3 className="font-semibold">Address and contact</h3>
                <p className="mt-2 text-sm">{[selected.address?.addressLine1, selected.address?.addressLine2, selected.address?.area, selected.address?.city, selected.address?.state, selected.address?.postalCode].filter(Boolean).join(', ') || 'Incomplete address'}</p>
                <p className="mt-1 text-sm">Type: {selected.salonType?.replace(/_/g, ' ') || 'Not supplied'}</p>
                <p className="mt-1 text-sm">Owner: {selected.owner?.name || 'Unknown'} ({selected.owner?.role || 'role unavailable'})</p>
                <p className="mt-1 text-sm">Phone: {selected.contact?.phone || selected.owner?.phone || 'Not supplied'}</p>
                <p className="mt-1 text-sm">Email: {selected.contact?.email || selected.owner?.email || 'Not supplied'}</p>
                {selected.contact?.website && <p className="mt-1 break-all text-sm">Website: {selected.contact.website}</p>}
                <p className="mt-1 break-all text-sm">Social links: {Object.entries(selected.socialLinks || {}).filter(([, url]) => url).map(([network, url]) => `${network}: ${url}`).join(' · ') || 'None supplied'}</p>
                <p className="mt-1 text-sm">Facilities: {selected.facilities?.map((facility) => facility.replace(/_/g, ' ')).join(', ') || 'None supplied'}</p>
                {selected.description && <p className="mt-2 whitespace-pre-wrap text-sm">{selected.description}</p>}
              </section>
              <section>
                <h3 className="font-semibold">Submitted services</h3>
                {selected.services?.length ? (
                  <ul className="mt-2 space-y-1 text-sm">
                    {selected.services.map((service) => <li key={service._id}>{service.name} — ₹{(service.price / 100).toFixed(0)}, {service.duration} min ({service.isActive ? 'active' : 'inactive'})</li>)}
                  </ul>
                ) : <p className="mt-2 text-sm text-neutral-500">No services submitted.</p>}
              </section>
              <section>
                <h3 className="font-semibold">Associated barbers</h3>
                {selected.barbers?.length ? (
                  <ul className="mt-2 space-y-2 text-sm">
                    {selected.barbers.map((barber) => <li key={barber._id}>{barber.name}{barber.title ? ` · ${barber.title}` : ''} · {barber.experienceYears ?? 0} years · {barber.specializations?.map((specialization) => specialization.replace(/_/g, ' ')).join(', ') || 'No specialties'} · {barber.user ? `Account: ${barber.user.name || barber.user.phone || 'linked'}` : 'Profile only; no account linked'} · {barber.isVerified && barber.isActive ? 'Approved and active' : 'Pending'}</li>)}
                  </ul>
                ) : <p className="mt-2 text-sm text-neutral-500">No barbers associated.</p>}
              </section>
              <section>
                <h3 className="font-semibold">Opening hours</h3>
                {selected.openingHours ? <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">{Object.entries(selected.openingHours).map(([day, hours]) => <li key={day}>{day}: {hours.isOpen ? `${hours.openTime || '—'}–${hours.closeTime || '—'}` : 'Closed'}</li>)}</ul> : <p className="mt-2 text-sm text-neutral-500">Opening hours not supplied.</p>}
              </section>
            </div>
            <section className="space-y-2 border-t border-neutral-200 pt-4">
              <h3 className="font-semibold">Owner identity documents</h3>
              <div className="flex flex-wrap gap-3">
                {selected.identityDocuments?.aadhaar ? (
                  <a className="font-semibold text-brand-pink underline" href={`/api/salon/onboarding/documents?salonId=${encodeURIComponent(selected._id)}&kind=aadhaar`}>Download Aadhaar</a>
                ) : <span className="text-sm text-neutral-500">Aadhaar not uploaded</span>}
                {selected.identityDocuments?.pan ? (
                  <a className="font-semibold text-brand-pink underline" href={`/api/salon/onboarding/documents?salonId=${encodeURIComponent(selected._id)}&kind=pan`}>Download PAN</a>
                ) : <span className="text-sm text-neutral-500">PAN not uploaded</span>}
              </div>
            </section>

            {statusLabel(selected) !== 'APPROVED' ? (
              <div className="space-y-3 border-t border-neutral-200 pt-4">
                <Input label="Rejection reason (required to reject)" value={reason} onChange={(event) => setReason(event.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={saving} onClick={() => void decide(true)}>{saving ? 'Saving…' : 'Approve salon'}</Button>
                  <Button type="button" variant="outline" disabled={saving || !reason.trim()} onClick={() => void decide(false)}>Reject application</Button>
                </div>
              </div>
            ) : null}

            <section className="border-t border-neutral-200 pt-4">
              <h3 className="font-semibold">Application history</h3>
              {history.length ? <ul className="mt-2 space-y-2 text-sm">{history.map((entry, index) => <li key={`${entry.action}-${entry.createdAt}-${index}`}>{new Date(entry.createdAt).toLocaleString()} — {entry.action}{entry.actorId?.name ? ` by ${entry.actorId.name}` : ''}{entry.metadata?.reason ? ` — ${entry.metadata.reason}` : ''}</li>)}</ul> : <p className="mt-2 text-sm text-neutral-500">No review decisions recorded.</p>}
            </section>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
