/**
 * Nearby Salons Component for Dashboard
 * Shows salons near the customer's location
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import { useAutoLocation } from '@/hooks/useAutoLocation';
import GoogleMap, { type MapSalon } from '@/components/location/GoogleMap';
import { Star, MapPin, Map } from 'lucide-react';
import { formatDistance } from '@/utils/distance';
import { SUPPORTED_LAUNCH_CITIES } from '@/constants/launch-cities';

interface Salon extends MapSalon {
  description?: string;
  logo?: string;
  isVerified: boolean;
  reviewCount: number;
  isDemoPreview?: boolean;
}

export default function NearbySalons() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState('Delhi');
  const [area, setArea] = useState('');
  const [searchByCity, setSearchByCity] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    latitude,
    longitude,
    error: locationError,
    loading: locationLoading,
    requestPermission,
  } = useAutoLocation();
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    let cancelled = false;
    const fetchNearbySalons = async () => {
      try {
        setLoading(true);
        setError(null);

        const hasLocation = !searchByCity && latitude !== null && longitude !== null;
        const params = new URLSearchParams({
            city,
            limit: '6',
            ...(area.trim() ? { area: area.trim() } : {}),
          });
        const endpoint = hasLocation ? '/api/salons/nearby' : '/api/salons';
        const response = await fetch(
          hasLocation ? endpoint : `${endpoint}?${params}`,
          hasLocation
            ? {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  latitude: String(latitude),
                  longitude: String(longitude),
                  radius: '5',
                  limit: '6',
                }),
              }
            : { method: 'GET' },
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Unable to load salons');
        }

        if (cancelled || currentRequest !== requestId.current) return;
        if (hasLocation) {
          setSalons(result.data?.salons || []);
        } else {
          setSalons(result.data || []);
        }
      } catch (fetchError) {
        if (cancelled || currentRequest !== requestId.current) return;
        console.error('Nearby salon request failed:', fetchError instanceof Error ? fetchError.name : 'UnknownError');
        setSalons([]);
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load salons');
      } finally {
        if (!cancelled && currentRequest === requestId.current) setLoading(false);
      }
    };

    void fetchNearbySalons();
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, city, area, searchByCity, refreshKey]);

  if (loading) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-foreground mb-4">Salons Near You</h2>
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {searchByCity || latitude === null ? 'Discover Salons' : 'Salons Near You'}
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            Browse public salon listings; demo previews are clearly identified.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-foreground-secondary">
            City
            <select
              aria-label="Choose a city"
              className="mt-1 block rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground"
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                setSearchByCity(true);
              }}
            >
              {SUPPORTED_LAUNCH_CITIES.map(({ city: cityName, state }) => (
                <option key={cityName} value={cityName}>{cityName}, {state}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-foreground-secondary">
            Area
            <input
              aria-label="Filter by locality"
              className="mt-1 block w-36 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground"
              placeholder="Any area"
              value={area}
              onChange={(event) => {
                setArea(event.target.value);
                setSearchByCity(true);
              }}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={locationLoading}
            onClick={() => {
              setSearchByCity(false);
              setArea('');
              requestPermission();
            }}
          >
            {locationLoading ? 'Detecting location...' : 'Use my location'}
          </Button>
          {salons.length > 0 && latitude !== null && longitude !== null && !searchByCity && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowMap(!showMap)}>
              {showMap ? 'Hide Map' : <Map size={18} />}
            </Button>
          )}
        </div>
      </div>

      {locationError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-error-700">
          <p>{locationError}</p>
          <Button type="button" variant="outline" size="sm" onClick={requestPermission} disabled={locationLoading}>
            Try location again
          </Button>
        </div>
      )}

      {/* Map View */}
      {showMap && latitude !== null && longitude !== null && !searchByCity && (
        <div className="mb-6">
          <GoogleMap
            salons={salons as MapSalon[]}
            center={{ latitude, longitude }}
            height="300px"
          />
        </div>
      )}

      {/* Salons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {salons.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-foreground-secondary">
            {error ? 'Salon results are unavailable right now.' : `No verified salons found in ${area.trim() || city}.`}
          </div>
        )}
        {salons.map((salon) => (
          <Link key={salon._id} href={`/salons/${salon.slug}`}>
            <div className="border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
              {/* Salon Image */}
              {salon.logo && (
                <div className="h-32 bg-gray-100 overflow-hidden">
                  <img
                    src={salon.logo}
                    alt={salon.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-3">
                {/* Name */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-semibold text-foreground line-clamp-2">
                    {salon.name}
                  </h3>
                  {salon.isDemoPreview ? (
                    <Badge variant="info" className="ml-2 flex-shrink-0 text-xs">
                      Demo preview
                    </Badge>
                  ) : salon.isVerified && (
                    <Badge variant="success" className="ml-2 flex-shrink-0 text-xs">
                      ✓
                    </Badge>
                  )}
                </div>

                {/* Rating */}
                {!salon.isDemoPreview && <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center text-yellow-500">
                    <Star size={14} fill="currentColor" />
                    <span className="ml-1 text-sm font-semibold">{salon.rating}</span>
                  </div>
                  <span className="text-xs text-foreground-secondary">
                    ({salon.reviewCount})
                  </span>
                </div>}
                {salon.isDemoPreview && (
                  <p className="mb-2 text-xs text-info-700">Illustrative listing, services, and availability.</p>
                )}

                {/* Location and Distance */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-foreground-secondary">
                    <MapPin size={12} />
                    <span className="line-clamp-1">
                      {salon.address.area || salon.address.city}
                    </span>
                  </div>
                  {salon.distance && (
                    <div className="font-medium text-brand-pink">
                      {formatDistance(salon.distance)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* View All Link */}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 text-sm text-error-700">
          <p>{error}</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => setRefreshKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      )}
      <Link href={`/salons?city=${encodeURIComponent(city)}${area.trim() ? `&area=${encodeURIComponent(area.trim())}` : ''}`}>
        <Button variant="ghost" fullWidth className="mt-2">
          View all {city} salons
        </Button>
      </Link>
    </Card>
  );
}
