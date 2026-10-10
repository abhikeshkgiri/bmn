'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Address = {
  _id: string;
  label: string;
  name: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  area?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
};

type AddressForm = Omit<Address, '_id'>;
const empty: AddressForm = {
  label: 'Home',
  name: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  area: '',
  city: '',
  state: '',
  postalCode: '',
  isDefault: false,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to complete the request.';
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<AddressForm>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAddresses = useCallback(async () => {
    const response = await fetch('/api/addresses');
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to load saved addresses.');
    setAddresses(result.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('/api/addresses');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load saved addresses.');
        if (!cancelled) setAddresses(result.data);
      } catch (loadError) {
        if (!cancelled) setError(errorMessage(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  function startEditing(address: Address) {
    setEditing(address._id);
    setForm({
      label: address.label,
      name: address.name,
      phone: address.phone || '',
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      area: address.area || '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
    });
    setError('');
    setSuccess('');
  }

  function cancelEditing() {
    setEditing(null);
    setForm(empty);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(editing ? `/api/addresses/${editing}` : '/api/addresses', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        const detail = result.error?.details?.[0]?.message;
        throw new Error(detail || result.error?.message || result.error || 'Unable to save address.');
      }
      await loadAddresses();
      setForm(empty);
      setEditing(null);
      setSuccess(editing ? 'Address updated successfully.' : 'Address added successfully.');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete address.');
      await loadAddresses();
      if (editing === id) cancelEditing();
      setSuccess('Address deleted successfully.');
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">Saved addresses</h1>
      <Card className="mb-8 p-6">
        <form className="space-y-3" onSubmit={(event) => void save(event)}>
          <Input label="Label" value={form.label} maxLength={40} required onChange={(event) => setForm({ ...form, label: event.target.value })} />
          <Input label="Name" value={form.name} minLength={2} maxLength={100} required onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Phone (optional)" value={form.phone} maxLength={20} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <Input label="Address line 1" value={form.addressLine1} minLength={2} maxLength={200} required onChange={(event) => setForm({ ...form, addressLine1: event.target.value })} />
          <Input label="Address line 2 (optional)" value={form.addressLine2} maxLength={200} onChange={(event) => setForm({ ...form, addressLine2: event.target.value })} />
          <Input label="Area (optional)" value={form.area} maxLength={100} onChange={(event) => setForm({ ...form, area: event.target.value })} />
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="City" value={form.city} minLength={2} maxLength={80} required onChange={(event) => setForm({ ...form, city: event.target.value })} />
            <Input label="State" value={form.state} minLength={2} maxLength={80} required onChange={(event) => setForm({ ...form, state: event.target.value })} />
            <Input label="Postal code" value={form.postalCode} minLength={3} maxLength={12} required onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
          </div>
          <label className="flex gap-2">
            <input type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} />
            Default address
          </label>
          {error && <p role="alert" className="text-sm text-error-600">{error}</p>}
          {success && <p role="status" className="text-sm text-success-700">{success}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" isLoading={saving}>{editing ? 'Update address' : 'Add address'}</Button>
            {editing && <Button type="button" variant="secondary" onClick={cancelEditing}>Cancel</Button>}
          </div>
        </form>
      </Card>
      {loading ? (
        <p role="status">Loading saved addresses…</p>
      ) : addresses.length === 0 ? (
        <p>No saved addresses yet.</p>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <Card key={address._id} className="flex justify-between gap-4 p-5">
              <div>
                <h2 className="font-bold">{address.label} {address.isDefault && '(Default)'}</h2>
                <p>{address.name}{address.phone ? `, ${address.phone}` : ''}, {address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}{address.area ? `, ${address.area}` : ''}, {address.city}, {address.state} {address.postalCode}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => startEditing(address)}>Edit</Button>
                <Button type="button" variant="secondary" isLoading={deleting === address._id} onClick={() => void remove(address._id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
