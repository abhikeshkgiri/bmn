'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface FavoriteItem {
  _id: string;
  favoriteId: string;
  name: string;
  slug?: string;
  logo?: string | null;
  coverImage?: string | null;
  images?: string[];
  profileImage?: string | null;
  address?: { area?: string | null; city?: string | null };
}

interface FavoritesData {
  salons: FavoriteItem[];
  barbers: FavoriteItem[];
}

interface FavoritesResponse {
  success?: boolean;
  data?: FavoritesData;
  error?: string | { message?: string };
}

const EMPTY_FAVORITES: FavoritesData = { salons: [], barbers: [] };

function responseError(result: FavoritesResponse, fallback: string): string {
  return typeof result.error === 'string'
    ? result.error
    : result.error?.message || fallback;
}

export default function FavoritesPage() {
  const [data, setData] = useState<FavoritesData>(EMPTY_FAVORITES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadFavorites = async () => {
      setLoading(true);
      setLoadError(null);
      setRequiresSignIn(false);
      try {
        const response = await fetch('/api/favorites');
        const result = await response.json() as FavoritesResponse;
        if (response.status === 401) {
          if (!cancelled) setRequiresSignIn(true);
          return;
        }
        if (!response.ok || !result.success || !result.data) {
          throw new Error(responseError(result, 'Unable to load favorites.'));
        }
        if (!cancelled) {
          setData({
            salons: Array.isArray(result.data.salons) ? result.data.salons : [],
            barbers: Array.isArray(result.data.barbers) ? result.data.barbers : [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load favorites.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadFavorites();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const removeFavorite = useCallback(async (favoriteId: string) => {
    setRemovingId(favoriteId);
    setLoadError(null);
    try {
      const response = await fetch(`/api/favorites/${favoriteId}`, { method: 'DELETE' });
      const result = await response.json() as FavoritesResponse;
      if (response.status === 401) {
        setRequiresSignIn(true);
        return;
      }
      if (!response.ok || !result.success) {
        throw new Error(responseError(result, 'Unable to remove this favorite.'));
      }
      setData((previous) => ({
        salons: previous.salons.filter((item) => item.favoriteId !== favoriteId),
        barbers: previous.barbers.filter((item) => item.favoriteId !== favoriteId),
      }));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to remove this favorite.');
    } finally {
      setRemovingId(null);
    }
  }, []);

  const renderItems = (items: FavoriteItem[], type: 'salon' | 'barber') => {
    if (items.length === 0) {
      return <p className="rounded-xl border border-dashed border-border p-6 text-sm text-foreground-secondary">No saved {type}s yet.</p>;
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.favoriteId} className="flex h-full flex-col gap-3 p-5">
            <div>
              <h3 className="font-semibold text-foreground">{item.name}</h3>
              {type === 'salon' && (item.address?.area || item.address?.city) && (
                <p className="mt-1 text-sm text-foreground-secondary">
                  {[item.address.area, item.address.city].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <div className="mt-auto flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-10 items-center text-sm font-medium text-brand-pink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
                href={type === 'salon' ? `/salons/${item.slug || item._id}` : `/barbers/${item.slug || item._id}`}
              >
                View {type}
              </Link>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void removeFavorite(item.favoriteId)}
                disabled={removingId !== null}
                aria-label={`Remove ${item.name} from favorites`}
              >
                {removingId === item.favoriteId ? 'Removing…' : 'Remove'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold text-foreground">Favorites</h1>
      {loading ? (
        <p role="status" className="rounded-xl border border-border p-8 text-center text-foreground-secondary">
          Loading your favorites…
        </p>
      ) : requiresSignIn ? (
        <Card className="p-8 text-center">
          <p className="mb-4 text-foreground-secondary">Sign in as a customer to view your saved salons and barbers.</p>
          <Link href="/login"><Button type="button">Sign in</Button></Link>
        </Card>
      ) : loadError ? (
        <Card role="alert" className="p-8 text-center">
          <p className="mb-4 text-error-600">{loadError}</p>
          <Button type="button" variant="outline" onClick={() => setRetryKey((key) => key + 1)}>Try again</Button>
        </Card>
      ) : (
        <>
          {loadError && <p role="alert" className="mb-4 text-sm text-error-600">{loadError}</p>}
          <section aria-labelledby="favorite-salons-heading" className="mb-8">
            <h2 id="favorite-salons-heading" className="mb-3 text-xl font-bold text-foreground">Salons</h2>
            {renderItems(data.salons, 'salon')}
          </section>
          <section aria-labelledby="favorite-barbers-heading">
            <h2 id="favorite-barbers-heading" className="mb-3 text-xl font-bold text-foreground">Barbers</h2>
            {renderItems(data.barbers, 'barber')}
          </section>
        </>
      )}
    </main>
  );
}
