'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

type FavoriteTargetType = 'SALON' | 'BARBER';

interface FavoriteResponse {
  success?: boolean;
  data?: {
    salons?: Array<{ _id: string; favoriteId: string }>;
    barbers?: Array<{ _id: string; favoriteId: string }>;
    _id?: string;
  };
  error?: string | { message?: string };
}

function getErrorMessage(result: FavoriteResponse, fallback: string): string {
  return typeof result.error === 'string'
    ? result.error
    : result.error?.message || fallback;
}

export function FavoriteButton({
  targetType,
  targetId,
}: {
  targetType: FavoriteTargetType;
  targetId: string;
}) {
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadFavoriteState = async () => {
      setLoading(true);
      setError(null);
      setRequiresSignIn(false);
      try {
        const response = await fetch('/api/favorites');
        const result = await response.json() as FavoriteResponse;
        if (response.status === 401) {
          if (!cancelled) setRequiresSignIn(true);
          return;
        }
        if (!response.ok || !result.success || !result.data) {
          throw new Error(getErrorMessage(result, 'Unable to check saved status.'));
        }
        const targetItems = result.data?.[targetType === 'SALON' ? 'salons' : 'barbers'] || [];
        if (!Array.isArray(targetItems)) {
          throw new Error('The saved status response was incomplete.');
        }
        const item = targetItems.find((candidate) => candidate._id === targetId);
        if (!cancelled) setFavoriteId(item?.favoriteId || null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to check saved status.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadFavoriteState();
    return () => {
      cancelled = true;
    };
  }, [targetId, targetType, retryKey]);

  async function toggleFavorite() {
    setBusy(true);
    setError(null);
    try {
      if (favoriteId) {
        const response = await fetch(`/api/favorites/${favoriteId}`, { method: 'DELETE' });
        const result = await response.json() as FavoriteResponse;
        if (response.status === 401) {
          setRequiresSignIn(true);
          return;
        }
        if (!response.ok || !result.success) {
          throw new Error(getErrorMessage(result, 'Unable to remove this favorite.'));
        }
        setFavoriteId(null);
      } else {
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetType, targetId }),
        });
        const result = await response.json() as FavoriteResponse;
        if (response.status === 401) {
          setRequiresSignIn(true);
          return;
        }
        if (!response.ok || !result.success || !result.data?._id) {
          throw new Error(getErrorMessage(result, 'Unable to save this favorite.'));
        }
        setFavoriteId(result.data._id);
      }
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to update this favorite.');
    } finally {
      setBusy(false);
    }
  }

  if (requiresSignIn) {
    return <Link href="/login" className="text-sm font-medium text-brand-pink hover:underline">Sign in to save</Link>;
  }

  if (loading) {
    return <Button type="button" variant="ghost" disabled aria-label="Checking saved status">Checking…</Button>;
  }

  if (error && !favoriteId) {
    return (
      <div className="space-y-1">
        <Button type="button" variant="ghost" onClick={() => setRetryKey((key) => key + 1)}>
          Retry saved status
        </Button>
        <p role="alert" className="text-xs text-error-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="ghost"
        onClick={() => void toggleFavorite()}
        disabled={busy}
        aria-pressed={favoriteId !== null}
        aria-label={`${favoriteId ? 'Remove' : 'Add'} ${targetType === 'SALON' ? 'salon' : 'barber'} ${favoriteId ? 'from' : 'to'} favorites`}
      >
        {busy ? 'Saving…' : favoriteId ? 'Saved' : 'Save'}
      </Button>
      {error && <p role="alert" className="text-xs text-error-600">{error}</p>}
    </div>
  );
}
