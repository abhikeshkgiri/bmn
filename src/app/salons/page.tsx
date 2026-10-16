'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Loading';
import { Loader2, MapPin, Navigation, Search, Star } from 'lucide-react';
import { formatDistance, isValidCoordinates } from '@/utils/distance';
import { getSupportedLaunchCity } from '@/constants/launch-cities';

interface Salon {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  images?: string[];
  address: {
    area?: string;
    city: string;
    state?: string;
  };
  rating: number;
  distance?: number;
  isVerified: boolean;
  reviewCount: number;
  isDemoPreview?: boolean;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const EMPTY_PAGINATION: PaginationData = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 0,
};

function SalonCard({ salon, showDistance = false }: { salon: Salon; showDistance?: boolean }) {
  return (
    <Link key={salon._id} href={`/salons/${salon.slug}`}>
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg">
        <div className="h-44 overflow-hidden rounded-t-lg bg-gray-100">
          {/* Salon image hosts are managed by salons, so avoid a static remote-host allow-list. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={salon.coverImage || salon.images?.[0] || salon.logo || '/salon-placeholder.svg'}
            alt={`${salon.name} salon`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/salon-placeholder.svg';
            }}
          />
        </div>
        <div className="p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-lg font-semibold text-foreground">{salon.name}</h3>
            {salon.isDemoPreview ? (
              <Badge variant="info" className="shrink-0">Demo preview</Badge>
            ) : salon.isVerified ? (
              <Badge variant="success" className="shrink-0">Verified</Badge>
            ) : null}
          </div>

          {!salon.isDemoPreview && salon.rating > 0 && (
            <div className="mb-3 flex items-center gap-2">
              <div className="flex items-center text-yellow-500">
                <Star size={16} fill="currentColor" />
                <span className="ml-1 font-semibold">{salon.rating}</span>
              </div>
              {salon.reviewCount > 0 && (
                <span className="text-sm text-foreground-secondary">({salon.reviewCount} reviews)</span>
              )}
            </div>
          )}

          {salon.description && (
            <p className="mb-3 line-clamp-2 text-sm text-foreground-secondary">{salon.description}</p>
          )}

          <div className="flex items-center justify-between gap-3 text-sm text-foreground-secondary">
            <span className="flex min-w-0 items-center gap-2">
              <MapPin size={16} className="shrink-0" />
              <span className="truncate">
                {salon.address.area ? `${salon.address.area}, ` : ''}
                {salon.address.city || 'City unavailable'}
              </span>
            </span>
            {showDistance && salon.distance !== undefined && (
              <span className="shrink-0 font-medium text-brand-pink">{formatDistance(salon.distance)}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function SalonsPage() {
  const [citySalons, setCitySalons] = useState<Salon[]>([]);
  const [nearbySalons, setNearbySalons] = useState<Salon[]>([]);
  const [pagination, setPagination] = useState<PaginationData>(EMPTY_PAGINATION);
  const [city, setCity] = useState('Delhi');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [locationCenter, setLocationCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = useState('');
  const [cityLoading, setCityLoading] = useState(true);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [unsupportedCity, setUnsupportedCity] = useState<string | null>(null);
  const cityRequestId = useRef(0);
  const nearbyRequestId = useRef(0);
  const locationRequested = useRef(false);
  const manualCityChoice = useRef(false);

  const fetchCitySalons = async (page = 1) => {
    const currentRequest = ++cityRequestId.current;
    setCityLoading(true);
    setCityError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(EMPTY_PAGINATION.limit),
        city,
        sortBy: 'rating',
      });
      if (searchTerm) params.set('search', searchTerm);
      const response = await fetch(`/api/salons?${params.toString()}`);
      const result = await response.json();
      if (!response.ok || !result.success || !Array.isArray(result.data) || !result.pagination) {
        throw new Error(result.error?.message || 'Unable to load salons. Please try again.');
      }
      if (currentRequest !== cityRequestId.current) return;
      setCitySalons(result.data);
      setPagination(result.pagination);
    } catch (error) {
      if (currentRequest !== cityRequestId.current) return;
      console.error('Salon city listing request failed:', error instanceof Error ? error.name : 'UnknownError');
      setCitySalons([]);
      setCityError(error instanceof Error ? error.message : 'Unable to load salons. Please try again.');
    } finally {
      if (currentRequest === cityRequestId.current) setCityLoading(false);
    }
  };

  const fetchNearbySalons = async (location: { latitude: number; longitude: number }) => {
    const currentRequest = ++nearbyRequestId.current;
    setNearbyLoading(true);
    setNearbyError(null);
    try {
      const response = await fetch('/api/salons/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: String(location.latitude),
          longitude: String(location.longitude),
          radius: '50',
          page: '1',
          limit: '6',
          ...(searchTerm ? { search: searchTerm } : {}),
        }),
      });
      const result = await response.json();
      const resultSalons = result.data?.salons;
      if (!response.ok || !result.success || !Array.isArray(resultSalons)) {
        throw new Error(result.error?.message || 'Unable to load nearby salons. Please try again.');
      }
      if (currentRequest !== nearbyRequestId.current) return;
      setNearbySalons(resultSalons);
      setLocationStatus('ready');

      const nearestSalonCity = resultSalons[0]?.address?.city;
      const supportedCity = nearestSalonCity ? getSupportedLaunchCity(nearestSalonCity) : undefined;
      if (supportedCity) {
        if (!manualCityChoice.current) setCity(supportedCity.city);
        setLocationMessage(
          `Showing nearby salons and top salons in ${manualCityChoice.current ? city : supportedCity.city}.`,
        );
      } else {
        setLocationMessage(
          `Nearby salons are sorted by distance. Showing top salons in ${manualCityChoice.current ? city : 'Delhi'} below.`,
        );
      }
    } catch (error) {
      if (currentRequest !== nearbyRequestId.current) return;
      console.error('Nearby salon request failed:', error instanceof Error ? error.name : 'UnknownError');
      setNearbySalons([]);
      setNearbyError(error instanceof Error ? error.message : 'Unable to load nearby salons. Please try again.');
      setLocationStatus('error');
    } finally {
      if (currentRequest === nearbyRequestId.current) setNearbyLoading(false);
    }
  };

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationMessage('Location is unavailable in this browser. You can still browse salons in Delhi.');
      return;
    }

    setLocationStatus('loading');
    setLocationMessage('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!isValidCoordinates(latitude, longitude)) {
          setLocationStatus('error');
          setLocationMessage('Could not read your location. You can still browse salons by city.');
          return;
        }
        setLocationCenter({ latitude, longitude });
      },
      (error) => {
        setLocationStatus('error');
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location access was denied. You can still browse salons by city.'
            : 'Could not detect your location. Please try again or browse salons by city.',
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedCity = params.get('city')?.trim();
    const supportedCity = requestedCity ? getSupportedLaunchCity(requestedCity) : undefined;
    const search = (params.get('search') || '').slice(0, 100);
    const timeoutId = window.setTimeout(() => {
      if (requestedCity && !supportedCity) {
        setUnsupportedCity(requestedCity.slice(0, 60));
      }
      if (supportedCity) {
        manualCityChoice.current = true;
        setCity(supportedCity.city);
      }
      setSearchInput(search);
      setSearchTerm(search);
      setFiltersInitialized(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!filtersInitialized) return;
    const timeoutId = window.setTimeout(() => void fetchCitySalons(1), 0);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersInitialized, city, searchTerm]);

  useEffect(() => {
    if (!locationCenter) {
      nearbyRequestId.current += 1;
      return;
    }
    const timeoutId = window.setTimeout(() => void fetchNearbySalons(locationCenter), 0);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationCenter, searchTerm]);

  useEffect(() => {
    if (!filtersInitialized || locationRequested.current) return;
    locationRequested.current = true;
    const timeoutId = window.setTimeout(requestCurrentLocation, 0);
    return () => window.clearTimeout(timeoutId);
  }, [filtersInitialized, requestCurrentLocation]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchInput.trim().slice(0, 100);
    const supportedCity = getSupportedLaunchCity(query);
    if (supportedCity) {
      manualCityChoice.current = true;
      setCity(supportedCity.city);
      setUnsupportedCity(null);
      setLocationCenter(null);
      nearbyRequestId.current += 1;
      setLocationStatus('idle');
      setNearbySalons([]);
      setLocationMessage('');
      setSearchInput('');
      setSearchTerm('');
      return;
    }
    setUnsupportedCity(null);
    setSearchTerm(query);
    setPagination(EMPTY_PAGINATION);
  };

  const changeCityPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), pagination.totalPages);
    setPagination((current) => ({ ...current, page: nextPage }));
    void fetchCitySalons(nextPage);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-brand-pink/10 to-transparent px-4 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-2 text-3xl font-bold text-foreground sm:text-4xl">Discover Salons</h1>
          <p className="text-foreground-secondary">
            Find a great salon nearby or explore the top salons in your city.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <section className="mb-8 rounded-2xl border border-border bg-white p-3 shadow-bookmynai-sm sm:p-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-neutral-50 px-3">
              <Search size={19} className="shrink-0 text-brand-pink" />
              <Input
                type="search"
                aria-label="Search salons by name or area"
                placeholder="Search salons or area"
                value={searchInput}
                maxLength={100}
                onChange={(event) => setSearchInput(event.target.value)}
                className="border-0 bg-transparent shadow-none focus:ring-0"
              />
            </div>
            <Button type="submit" variant="primary" className="sm:min-w-32">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={requestCurrentLocation}
              disabled={locationStatus === 'loading'}
              className="sm:min-w-48"
            >
              {locationStatus === 'loading' ? (
                <Loader2 size={17} className="mr-2 animate-spin" />
              ) : (
                <Navigation size={17} className="mr-2" />
              )}
              {locationStatus === 'loading' ? 'Finding nearby…' : 'Use my location'}
            </Button>
          </form>
          {locationMessage && (
            <p role="status" className={`mt-3 text-sm ${locationStatus === 'error' ? 'text-foreground-secondary' : 'text-green-700'}`}>
              {locationMessage}
            </p>
          )}
        </section>

        {unsupportedCity && (
          <Card role="status" className="mb-8 p-6">
            <p className="font-semibold">We are not listing salons in {unsupportedCity} yet.</p>
            <p className="mt-1 text-sm text-foreground-secondary">
              Showing popular salons in {city} instead. Search a supported city to switch listings.
            </p>
          </Card>
        )}

        <section aria-labelledby="nearby-heading" className="mb-10">
            <div className="mb-4">
              <h2 id="nearby-heading" className="text-2xl font-bold text-foreground">Nearest salons</h2>
              <p className="text-sm text-foreground-secondary">Closest salons to your current location</p>
            </div>
            {nearbyLoading ? (
              <div role="status" className="flex justify-center py-8">
                <Spinner size="lg" />
                <span className="sr-only">Finding nearby salons…</span>
              </div>
            ) : nearbyError ? (
              <Card role="alert" className="p-6 text-center">
                <p className="mb-3 text-error-600">{nearbyError}</p>
                <Button variant="outline" onClick={() => locationCenter && void fetchNearbySalons(locationCenter)}>
                  Try again
                </Button>
              </Card>
            ) : nearbySalons.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {nearbySalons.map((salon) => (
                  <SalonCard key={salon._id} salon={salon} showDistance />
                ))}
              </div>
            ) : locationStatus === 'ready' ? (
              <Card role="status" className="p-6 text-center text-foreground-secondary">
                No salons were found within 50 km. Browse the top city salons below.
              </Card>
            ) : locationStatus === 'error' ? (
              <Card role="status" className="flex flex-col items-center gap-3 p-6 text-center">
                <p className="text-foreground-secondary">Allow location access to see salons closest to you.</p>
                <Button variant="outline" onClick={requestCurrentLocation}>Use my location</Button>
              </Card>
            ) : (
              <Card role="status" className="flex flex-col items-center gap-3 p-6 text-center">
                <p className="text-foreground-secondary">Use your location to see salons closest to you.</p>
                <Button variant="outline" onClick={requestCurrentLocation}>Use my location</Button>
              </Card>
            )}
        </section>

        <section aria-labelledby="city-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="city-heading" className="text-2xl font-bold text-foreground">
                Top salons in {city}
              </h2>
              <p className="text-sm text-foreground-secondary">Popular, approved salons in your city</p>
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchTerm('');
                }}
                className="text-sm font-medium text-brand-pink hover:underline"
              >
                Clear search
              </button>
            )}
          </div>

          {cityLoading ? (
            <div role="status" className="flex justify-center py-12">
              <Spinner size="lg" />
              <span className="sr-only">Loading top salons…</span>
            </div>
          ) : cityError ? (
            <Card role="alert" className="p-8 text-center">
              <p className="mb-4 text-error-600">{cityError}</p>
              <Button variant="outline" onClick={() => void fetchCitySalons(pagination.page)}>Try again</Button>
            </Card>
          ) : citySalons.length === 0 ? (
            <Card role="status" className="p-8 text-center">
              <p className="text-lg text-foreground-secondary">
                {searchTerm ? 'No salons match your search.' : `No salons are listed in ${city} yet.`}
              </p>
              <p className="mt-1 text-sm text-foreground-secondary">
                {searchTerm ? 'Try another salon name or area.' : 'Try another search or check back soon.'}
              </p>
            </Card>
          ) : (
            <>
              <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {citySalons.map((salon) => <SalonCard key={salon._id} salon={salon} />)}
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => changeCityPage(pagination.page - 1)}
                    disabled={pagination.page === 1 || cityLoading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-foreground-secondary">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => changeCityPage(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages || cityLoading}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
