'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { MapPin, Search, Navigation, ArrowRight, Loader2 } from 'lucide-react';

export function SearchForm() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [query, setQuery] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setDetectingLocation(true);
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Prefer a neighborhood or local area over the broad city name.
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const area =
              data.address?.suburb ||
              data.address?.neighbourhood ||
              data.address?.city_district ||
              data.address?.village ||
              data.address?.town ||
              data.address?.county ||
              data.address?.city;
            const city = data.address?.city || data.address?.town || data.address?.county || 'Current Location';
            const detectedLocation = area && area !== city ? area : city;

            setLocation(detectedLocation);
            setDetectingLocation(false);
          } catch {
            // Fallback if geocoding fails
            setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
            setDetectingLocation(false);
          }
        },
        () => {
          alert('Unable to get your location. Please enable location services and try again.');
          setDetectingLocation(false);
        }
      );
    } catch {
      alert('Failed to detect location');
      setDetectingLocation(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (query) params.append('q', query);

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
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-transparent text-sm text-brand-black outline-none placeholder:text-foreground-secondary"
            aria-label="Location"
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
            placeholder="Search salon, service, or barber"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-brand-black outline-none placeholder:text-foreground-secondary"
            aria-label="Search"
          />
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full md:w-auto !bg-brand-pink !text-white shadow-md">
          Find Available Slots
          <ArrowRight size={18} className="ml-2" />
        </Button>
      </div>
    </form>
  );
}
