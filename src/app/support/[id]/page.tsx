'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

type Ticket = { subject: string; status: string; messages: Array<{ message: string; createdAt: string }> };

export default function SupportTicketPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch(`/api/support/tickets/${id}`)
        .then((response) => response.json())
        .then((result) => setTicket(result.data || null));
    }, 0);
    return () => clearTimeout(timer);
  }, [id]);

  async function reply() {
    await fetch(`/api/support/tickets/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
    setMessage('');
    const response = await fetch(`/api/support/tickets/${id}`);
    const result = await response.json();
    setTicket(result.data || null);
  }

  if (!ticket) return <main className="max-w-3xl mx-auto px-4 py-12">Ticket not found</main>;
  return <main className="max-w-3xl mx-auto px-4 py-12"><h1 className="text-3xl font-bold mb-2">{ticket.subject}</h1><p className="text-sm text-foreground-secondary mb-6">Status: {ticket.status}</p><Card className="p-6 space-y-4 mb-6">{ticket.messages.map((item, index) => <p key={`${item.createdAt}-${index}`} className="border-b pb-3">{item.message}</p>)}</Card>{ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && <Card className="p-6 space-y-3"><textarea className="w-full border rounded p-3" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a reply" /><Button variant="primary" onClick={() => void reply()}>Reply</Button></Card>}</main>;
}
