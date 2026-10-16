'use client';

import { useEffect, useState } from 'react';

const labels: Record<string, string> = {
  analytics: 'Analytics',
  commissions: 'Commissions',
  payouts: 'Payouts',
  inventory: 'Inventory',
  leaves: 'Leave and closures',
  coupons: 'Coupons',
  memberships: 'Membership plans',
};

export default function AdminDataPage({ resource }: { resource: string }) {
  const [data, setData] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/${resource}`)
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.error?.message || 'Unable to load data');
        setData(Array.isArray(json.data) ? json.data : [json.data]);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load data'))
      .finally(() => setLoading(false));
  }, [resource]);

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-brand-pink">Admin operations</p>
        <h1 className="mt-2 text-3xl font-bold">{labels[resource] || resource}</h1>
      </header>
      {loading && <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">Loading...</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>}
      {!loading && !error && data.length === 0 && <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">No records found.</div>}
      {!loading && !error && data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <pre className="min-w-[640px] p-6 text-xs text-neutral-700">{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </section>
  );
}
