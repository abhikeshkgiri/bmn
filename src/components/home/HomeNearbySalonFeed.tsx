'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Loading';
import HomeSalonCard, { type HomeSalonCardData } from '@/components/home/HomeSalonCard';
import { isValidCoordinates } from '@/utils/distance';

type NearbySalon = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  address?: {
    area?: string;
    city?: string;
  };
  rating: number;
  reviewCount: number;
  isDemoPreview?: boolean;
  distance: number;
};

export default function HomeNearbySalonFeed() {
  const [salons, setSalons] = useState<HomeSalonCardData[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const findNearbySalons = useCallback(() => {
    setStatus('loading');
    setErrorMessage('');
    setSalons([]);

    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage('Location is not available in this browser. Browse all salons instead.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (!isValidCoordinates(coords.latitude, coords.longitude)) {
          setStatus('error');
          setErrorMessage('Your device returned an invalid location. Please try again.');
          return;
        }

        try {
          const response = await fetch('/api/salons/nearby', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: String(coords.latitude),
              longitude: String(coords.longitude),
              radius: '50',
              page: '1',
              limit: '3',
            }),
          });
          const result = await response.json();
          const nearby = result.data?.salons as NearbySalon[] | undefined;
          if (!response.ok || !result.success || !Array.isArray(nearby)) {
            throw new Error(result.error?.message || 'Unable to load nearby salons.');
          }

          setSalons(nearby.map((salon) => ({
            _id: salon._id,
            name: salon.name,
            slug: salon.slug,
            description: salon.description,
            rating: Number.isFinite(salon.rating) ? salon.rating : 0,
            reviewCount: Number.isFinite(salon.reviewCount) ? salon.reviewCount : 0,
            isDemoPreview: salon.isDemoPreview ?? false,
            imageUrl: salon.logo || null,
            area: salon.address?.area,
            city: salon.address?.city,
            distance: salon.distance,
          })));
          setStatus('ready');
        } catch (error) {
          console.error('Homepage nearby salon lookup failed:', error instanceof Error ? error.name : 'UnknownError');
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load nearby salons.');
          setStatus('error');
        }
      },
      (error) => {
        setErrorMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Allow location access to see salons nearest to you.'
            : 'Could not detect your location. Please try again.',
        );
        setStatus('error');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(findNearbySalons, 0);
    return () => window.clearTimeout(timeoutId);
  }, [findNearbySalons]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-14" aria-labelledby="nearest-home-salons">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="nearest-home-salons" className="text-2xl font-bold text-brand-black md:text-3xl">
            Nearest salons
          </h2>
          <p className="mt-2 text-foreground-secondary">The closest salons to your current location</p>
        </div>
        <Link href="/salons" className="text-sm font-semibold text-brand-pink hover:underline">
          See all salons
        </Link>
      </div>

      {status === 'loading' ? (
        <div role="status" className="flex justify-center py-8">
          <Spinner size="lg" />
          <span className="sr-only">Finding salons near you…</span>
        </div>
      ) : status === 'error' ? (
        <Card role="status" className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm text-foreground-secondary">{errorMessage}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={findNearbySalons}>
              <MapPin size={16} className="mr-2" />
              Try location again
            </Button>
            <Link href="/salons">
              <Button variant="primary">Browse all salons</Button>
            </Link>
          </div>
        </Card>
      ) : salons.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {salons.map((salon) => <HomeSalonCard key={salon._id} salon={salon} />)}
        </div>
      ) : (
        <Card role="status" className="p-6 text-center">
          <p className="text-sm text-foreground-secondary">No salons found within 50 km of your location.</p>
          <Link href="/salons" className="mt-3 inline-block text-sm font-semibold text-brand-pink hover:underline">
            Explore all salons
          </Link>
        </Card>
      )}
    </section>
  );
}
