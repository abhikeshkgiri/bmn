'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MapPin, Scissors, Star } from 'lucide-react';
import { getSupportedLaunchCity } from '@/constants/launch-cities';
import ComingSoonLocation from '@/components/location/ComingSoonLocation';
import SupportedCitySelect from '@/components/location/SupportedCitySelect';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

const DEFAULT_LOCATION = 'Delhi';

interface SalonAddress {
  city?: string;
  area?: string;
  state?: string;
}

interface HomeSalon {
  _id: string;
  name: string;
  slug: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string | null;
  address?: SalonAddress;
}

interface ApiHomeSalon extends Omit<HomeSalon, 'imageUrl'> {
  logo?: string | null;
  coverImage?: string | null;
  images?: string[];
}

function normalizeCity(value: string | null | undefined): string {
  const cleaned = value?.trim();
  if (!cleaned) return DEFAULT_LOCATION;
  return getSupportedLaunchCity(cleaned)?.city || cleaned;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-neutral-50 p-8 text-center">
      <p className="text-sm text-foreground-secondary">{message}</p>
    </div>
  );
}

function SalonCard({ salon }: { salon: HomeSalon }) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-bookmynai-lg">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-brand-pink/15 via-neutral-100 to-white">
        {salon.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={salon.imageUrl}
            alt={`${salon.name} salon`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-brand-pink/40" aria-hidden="true">
            <Scissors size={40} />
          </div>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-brand-black">{salon.name}</h3>
            <p className="flex items-center gap-1 text-sm text-foreground-secondary">
              <MapPin size={13} className="text-brand-pink" />
              {salon.address?.area || salon.address?.city || 'Nearby'}
            </p>
          </div>
          {typeof salon.rating === 'number' && salon.rating > 0 ? (
            <div className="flex items-center gap-1 rounded-lg bg-neutral-50 px-2 py-1 text-sm font-semibold text-brand-black">
              <Star size={13} className="fill-yellow-400 text-yellow-400" />
              {salon.rating}
            </div>
          ) : null}
        </div>
        {typeof salon.reviewCount === 'number' && salon.reviewCount > 0 ? (
          <p className="text-sm text-foreground-secondary">{salon.reviewCount} reviews</p>
        ) : null}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          <Link href={`/salons/${salon.slug}`}>
            <Button variant="outline" size="sm" className="w-full">View Salon</Button>
          </Link>
          <Link href={`/salons/${salon.slug}?book=1`}>
            <Button variant="primary" size="sm" className="w-full">Book Now</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomeSalonFeed() {
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION);
  const [salons, setSalons] = useState<HomeSalon[]>([]);
  const [loadingSalons, setLoadingSalons] = useState(true);
  const [salonLoadError, setSalonLoadError] = useState(false);
  const locationRequestId = useRef(0);

  const loadForLocation = useCallback(async (city: string) => {
    const normalized = normalizeCity(city);
    const requestId = ++locationRequestId.current;
    setSelectedLocation(normalized);
    setLoadingSalons(true);
    setSalonLoadError(false);

    if (!getSupportedLaunchCity(normalized)) {
      setSalons([]);
      setLoadingSalons(false);
      return;
    }

    try {
      const response = await fetch(`/api/salons?city=${encodeURIComponent(normalized)}&limit=12`);
      const result = (await response.json()) as { success?: boolean; data?: ApiHomeSalon[] };
      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(`Salon discovery returned status ${response.status}.`);
      }
      if (requestId !== locationRequestId.current) return;

      setSalons(result.data.map((salon) => ({
        _id: salon._id,
        name: salon.name,
        slug: salon.slug,
        rating: salon.rating,
        reviewCount: salon.reviewCount,
        imageUrl: salon.coverImage || salon.images?.[0] || salon.logo || null,
        address: salon.address,
      })));
    } catch (error) {
      if (requestId !== locationRequestId.current) return;
      console.error('Homepage salon discovery failed:', error instanceof Error ? error.name : 'UnknownError');
      setSalons([]);
      setSalonLoadError(true);
    } finally {
      if (requestId === locationRequestId.current) setLoadingSalons(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadForLocation(DEFAULT_LOCATION);
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      locationRequestId.current += 1;
    };
  }, [loadForLocation]);

  const loadAndPersistLocation = (city: string) => {
    try {
      window.localStorage.setItem('bookmynai-location', city);
    } catch (error) {
      console.error('Unable to save the homepage location:', error instanceof Error ? error.name : 'UnknownError');
    }
    void loadForLocation(city);
  };
  const handleLocationChange = ({ city }: { city: string; state: string }) => {
    loadAndPersistLocation(city);
  };
  const handleUnsupportedCityChange = (city: string) => loadAndPersistLocation(city);

  const unsupportedCity = !getSupportedLaunchCity(selectedLocation);

  if (unsupportedCity) {
    return <ComingSoonLocation city={selectedLocation} onChooseCity={handleUnsupportedCityChange} />;
  }

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <SupportedCitySelect
          value={selectedLocation}
          label="Browse salons in"
          onChange={handleLocationChange}
        />
      </div>
      {loadingSalons ? (
        <p role="status" className="rounded-2xl border border-border bg-neutral-50 p-8 text-center text-sm text-foreground-secondary">
          Loading salons in {selectedLocation}...
        </p>
      ) : salonLoadError ? (
        <div className="space-y-4">
          <EmptyState message="Salon listings are temporarily unavailable. Please try again shortly." />
          <Button variant="outline" size="sm" onClick={() => void loadForLocation(selectedLocation)}>
            Try again
          </Button>
        </div>
      ) : salons.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {salons.slice(0, 6).map((salon) => <SalonCard key={salon._id} salon={salon} />)}
        </div>
      ) : (
        <EmptyState message={`No salons are listed in ${selectedLocation} yet. Once salons join BookMyNai, they'll show up right here.`} />
      )}
    </div>
  );
}
