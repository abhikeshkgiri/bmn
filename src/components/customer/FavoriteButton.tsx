'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

export function FavoriteButton({ targetType, targetId }: { targetType: 'SALON' | 'BARBER'; targetId: string }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    if (saved) {
      const response = await fetch('/api/favorites');
      const result = await response.json();
      const items = result.data?.[targetType === 'SALON' ? 'salons' : 'barbers'] || [];
      const item = items.find((candidate: { _id: string }) => candidate._id === targetId);
      if (item?.favoriteId) await fetch(`/api/favorites/${item.favoriteId}`, { method: 'DELETE' });
      setSaved(false);
    } else {
      const response = await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType, targetId }) });
      if (response.ok) setSaved(true);
    }
    setBusy(false);
  }
  return <Button variant="ghost" onClick={() => void toggle()} disabled={busy}>{saved ? 'Saved' : 'Save'}</Button>;
}
