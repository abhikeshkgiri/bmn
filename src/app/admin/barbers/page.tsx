'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface AdminBarber { _id: string; name: string; salon?: { name?: string }; isVerified: boolean }

export default function AdminBarbersPage() {
  const [barbers, setBarbers] = useState<AdminBarber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/admin/barbers?page=1&limit=10');
      const json = await res.json();
      if (json.success) setBarbers(json.data || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle>Barber approvals</CardTitle></CardHeader>
      <CardContent>
        {loading ? <div>Loading barbers…</div> : barbers.length === 0 ? <div>No barbers found.</div> : (
          <div className="space-y-3">
            {barbers.map((barber) => (
              <div key={barber._id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                <div>
                  <div className="font-medium">{barber.name}</div>
                  <div className="text-sm text-neutral-500">{barber.salon?.name || 'Salon'}</div>
                </div>
                <Badge variant={barber.isVerified ? 'success' : 'warning'}>{barber.isVerified ? 'Verified' : 'Pending'}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
