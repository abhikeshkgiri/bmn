'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Address = { _id: string; label: string; name: string; addressLine1: string; city: string; state: string; postalCode: string; isDefault: boolean };
const empty = { label: 'Home', name: '', addressLine1: '', city: '', state: '', postalCode: '', isDefault: false };

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch('/api/addresses')
        .then((response) => response.json())
        .then((result) => setAddresses(result.data || []));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function save() {
    await fetch(editing ? `/api/addresses/${editing}` : '/api/addresses', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm(empty); setEditing(null);
    const response = await fetch('/api/addresses');
    const result = await response.json();
    setAddresses(result.data || []);
  }
  async function remove(id: string) { await fetch(`/api/addresses/${id}`, { method: 'DELETE' }); const response = await fetch('/api/addresses'); const result = await response.json(); setAddresses(result.data || []); }

  return <main className="max-w-4xl mx-auto px-4 py-12"><h1 className="text-3xl font-bold mb-6">Saved addresses</h1><Card className="p-6 mb-8 space-y-3"><Input placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /><Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><Input placeholder="Address" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} /><div className="grid md:grid-cols-3 gap-3"><Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /><Input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /><Input placeholder="Postal code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></div><label className="flex gap-2"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Default address</label><Button variant="primary" onClick={() => void save()}>{editing ? 'Update address' : 'Add address'}</Button></Card><div className="space-y-3">{addresses.map((address) => <Card key={address._id} className="p-5 flex justify-between"><div><h2 className="font-bold">{address.label} {address.isDefault && '(Default)'}</h2><p>{address.name}, {address.addressLine1}, {address.city}, {address.state} {address.postalCode}</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => { setEditing(address._id); setForm({ ...empty, ...address }); }}>Edit</Button><Button variant="secondary" onClick={() => void remove(address._id)}>Delete</Button></div></Card>)}</div></main>;
}
