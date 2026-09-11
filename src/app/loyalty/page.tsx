'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';

export default function LoyaltyPage() {
  const [data, setData] = useState<{ pointsBalance?: number; lifetimePoints?: number; redeemedPoints?: number; currentMembership?: { planName: string; expiryDate: string } } | null>(null);
  const [history, setHistory] = useState<Array<{ transactionType: string; points: number; reason: string; createdAt: string }>>([]);
  useEffect(() => { Promise.all([fetch('/api/loyalty').then((r) => r.json()), fetch('/api/loyalty/history').then((r) => r.json())]).then(([account, transactions]) => { setData(account.data); setHistory(transactions.transactions || []); }); }, []);
  return <main className="max-w-4xl mx-auto px-4 py-12"><h1 className="text-3xl font-bold mb-6">Loyalty</h1><div className="grid md:grid-cols-3 gap-4 mb-8"><Card className="p-5"><p className="text-sm text-foreground-secondary">Available points</p><p className="text-3xl font-bold">{data?.pointsBalance ?? 0}</p></Card><Card className="p-5"><p className="text-sm text-foreground-secondary">Lifetime points</p><p className="text-3xl font-bold">{data?.lifetimePoints ?? 0}</p></Card><Card className="p-5"><p className="text-sm text-foreground-secondary">Redeemed points</p><p className="text-3xl font-bold">{data?.redeemedPoints ?? 0}</p></Card></div><Card className="p-6"><h2 className="text-xl font-bold mb-4">Transaction history</h2><div className="space-y-3">{history.map((item, index) => <div key={`${item.createdAt}-${index}`} className="flex justify-between border-b pb-2"><span>{item.reason}</span><span className={item.points >= 0 ? 'text-green-600' : 'text-red-600'}>{item.points > 0 ? '+' : ''}{item.points}</span></div>)}</div></Card></main>;
}
