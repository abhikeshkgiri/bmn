'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Ticket = { _id: string; subject: string; status: string; category: string };

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [form, setForm] = useState({ category: 'OTHER', subject: '', message: '' });
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch('/api/support/tickets')
        .then((response) => response.json())
        .then((result) => setTickets(result.data || []));
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  async function create() { await fetch('/api/support/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); setForm({ ...form, subject: '', message: '' }); const response = await fetch('/api/support/tickets'); const result = await response.json(); setTickets(result.data || []); }
  return <main className="max-w-3xl mx-auto px-4 py-12"><h1 className="text-3xl font-bold mb-6">Help and support</h1><Card className="p-6 space-y-3 mb-8"><select className="w-full border rounded p-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>BOOKING</option><option>PAYMENT</option><option>ACCOUNT</option><option>SALON</option><option>OTHER</option></select><Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /><textarea className="w-full border rounded p-3" rows={5} placeholder="How can we help?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /><Button variant="primary" onClick={() => void create()}>Create ticket</Button></Card><div className="space-y-3">{tickets.map((ticket) => <a key={ticket._id} href={`/support/${ticket._id}`}><Card className="p-5"><h2 className="font-bold">{ticket.subject}</h2><p className="text-sm text-foreground-secondary">{ticket.category} · {ticket.status}</p></Card></a>)}</div></main>;
}
