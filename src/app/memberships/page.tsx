'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatCurrency } from '@/utils/currency';
import { RazorpayCheckout } from '@/components/payment/RazorpayCheckout';

type Plan = { _id: string; name: string; description?: string; price: number; duration: number; discountPercentage?: number; benefits: string[] };
type Order = { orderId: string; amount: number; currency: string; keyId: string; membershipId: string; plan: Plan };

export default function MembershipsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => { void fetch('/api/memberships/plans').then((r) => r.json()).then((result) => setPlans(result.data || [])); }, []);
  async function purchase(plan: Plan) { const response = await fetch('/api/memberships/purchase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: plan._id }) }); const result = await response.json(); if (result.success) setOrder({ ...result.data, plan }); else setMessage(result.error?.message || result.error || 'Unable to start purchase'); }
  async function verify(payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) { if (!order) return; const response = await fetch('/api/memberships/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ membershipId: order.membershipId, ...payment }) }); setMessage(response.ok ? 'Membership activated' : 'Membership verification failed'); setOrder(null); }
  if (order) return <main className="max-w-2xl mx-auto px-4 py-12"><h1 className="text-3xl font-bold mb-6">Pay for {order.plan.name}</h1><Card className="p-6"><RazorpayCheckout orderId={order.orderId} amount={order.amount} currency={order.currency} keyId={order.keyId} bookingNumber={order.plan.name} customerName="Customer" customerEmail="" customerPhone="" salonName="BookMyNai membership" onSuccess={verify} onFailure={async () => { setMessage('Membership payment failed'); }} onCancel={() => setOrder(null)} /></Card></main>;
  return <main className="max-w-4xl mx-auto px-4 py-12"><h1 className="text-3xl font-bold mb-6">Membership plans</h1>{message && <p className="mb-4">{message}</p>}<div className="grid md:grid-cols-2 gap-5">{plans.map((plan) => <Card key={plan._id} className="p-6"><h2 className="text-xl font-bold">{plan.name}</h2><p className="text-2xl font-bold text-brand-pink my-3">{formatCurrency(plan.price)}</p><p>{plan.description}</p><p className="text-sm mt-2">{plan.discountPercentage || 0}% booking discount for {plan.duration} month(s)</p><ul className="list-disc pl-5 my-4">{plan.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul><Button variant="primary" onClick={() => void purchase(plan)}>Choose plan</Button></Card>)}</div></main>;
}
