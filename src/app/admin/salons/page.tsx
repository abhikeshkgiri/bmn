'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface AdminSalon { _id: string; name: string; address?: { city?: string }; isVerified: boolean }

export default function AdminSalonsPage() {
  const [salons, setSalons] = useState<AdminSalon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/admin/salons?page=1&limit=10');
      const json = await res.json();
      if (json.success) setSalons(json.data || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle>Salon approvals</CardTitle></CardHeader>
      <CardContent>
        {loading ? <div>Loading salons…</div> : salons.length === 0 ? <div>No salons found.</div> : (
          <div className="space-y-3">
            {salons.map((salon) => (
              <div key={salon._id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                <div>
                  <div className="font-medium">{salon.name}</div>
                  <div className="text-sm text-neutral-500">{salon.address?.city}</div>
                </div>
                <Badge variant={salon.isVerified ? 'success' : 'warning'}>{salon.isVerified ? 'Verified' : 'Pending'}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
