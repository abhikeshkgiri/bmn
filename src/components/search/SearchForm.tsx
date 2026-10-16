'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { MapPin, Search, Navigation, ArrowRight, Loader2 } from 'lucide-react';
import { isValidCoordinates } from '@/utils/distance';

export function SearchForm() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [query, setQuery] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location detection is not supported by your browser. Enter a city or area instead.');
      return;
    }

    setDetectingLocation(true);
    setLocationError(null);
    try {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        if (!isValidCoordinates(latitude, longitude)) {
          setLocationError('Your device returned invalid coordinates. Enter a city or area instead.');
          setDetectingLocation(false);
          return;
        }

        try {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 8000);
          const params = new URLSearchParams({
            format: 'json',
            lat: latitude.toFixed(3),
            lon: longitude.toFixed(3),
          });
          let response: Response;
          try {
            response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
              headers: { Accept: 'application/json' },
              signal: controller.signal,
            });
          } finally {
            window.clearTimeout(timeoutId);
          }
          if (!response.ok) throw new Error('Reverse geocoding request failed');

          const data = await response.json() as {
            address?: Record<string, string | undefined>;
          };
          const address = data.address;
          const city = address?.city || address?.town || address?.village || address?.municipality;
          const area =
            address?.suburb ||
            address?.neighbourhood ||
            address?.city_district ||
            address?.quarter;
          const detectedLocation = area || city;

          if (!detectedLocation) throw new Error('No nearby area was returned');
          setLocation(detectedLocation.slice(0, 80));
        } catch {
          setLocationError('Could not determine your area. Enter a city or area manually.');
        } finally {
          setDetectingLocation(false);
        }
      }, (error) => {
        const message = error.code === 1
          ? 'Location permission was denied. Enter a city or area instead.'
          : error.code === 2
            ? 'Your location is unavailable. Enter a city or area instead.'
            : error.code === 3
              ? 'Location detection timed out. Try again or enter a city or area.'
              : 'Unable to detect your location. Enter a city or area instead.';
        setLocationError(message);
        setDetectingLocation(false);
      }, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      });
    } catch {
      setLocationError('Unable to start location detection. Enter a city or area instead.');
      setDetectingLocation(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (query) params.append('q', query);
    if (serviceQuery) params.append('service', serviceQuery);

    router.push(`/search?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="rounded-2xl border border-border bg-white p-3 shadow-bookmynai-lg md:p-4"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-neutral-50 px-3 py-2.5">
          <MapPin size={18} className="shrink-0 text-brand-pink" />
          <input
            type="text"
            placeholder="Detect or enter your location"
            value={location}
            maxLength={80}
            onChange={(e) => {
              setLocation(e.target.value);
              setLocationError(null);
            }}
            className="w-full bg-transparent text-sm text-brand-black outline-none placeholder:text-foreground-secondary"
            aria-label="City or area"
          />
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={detectingLocation}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-brand-pink/20 bg-brand-pink/10 px-2 py-1 text-xs font-medium text-brand-pink transition-colors hover:border-brand-pink hover:bg-brand-pink/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink disabled:cursor-not-allowed disabled:opacity-50"
            title="Detect your current location"
          >
            {detectingLocation ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <Navigation size={13} />
                Detect
              </>
            )}
          </button>
        </div>

        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-neutral-50 px-3 py-2.5">
          <Search size={18} className="shrink-0 text-brand-pink" />
          <input
            type="text"
            placeholder="Search salon name or area"
            value={query}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-brand-black outline-none placeholder:text-foreground-secondary"
            aria-label="Search salon name or area"
          />
        </div>

        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-neutral-50 px-3 py-2.5">
          <Search size={18} className="shrink-0 text-brand-pink" />
          <input
            type="search"
            placeholder="Search a service, e.g. haircut"
            value={serviceQuery}
            maxLength={80}
            onChange={(e) => setServiceQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-brand-black outline-none placeholder:text-foreground-secondary"
            aria-label="Search services"
          />
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full md:w-auto !bg-brand-pink !text-white shadow-md">
          Search Salons
          <ArrowRight size={18} className="ml-2" />
        </Button>
      </div>
      {locationError && <p role="alert" className="mt-3 text-sm text-error-600">{locationError}</p>}
    </form>
  );
}
