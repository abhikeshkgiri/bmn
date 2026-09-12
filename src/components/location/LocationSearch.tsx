/**
 * Location Search Component
 * Allows users to search for salons by location
 */

'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import CurrentLocationButton from './CurrentLocationButton';
import { MapPin, Search } from 'lucide-react';

interface LocationSearchProps {
  onSearch?: (latitude: number, longitude: number, radius: number) => void;
  onCityAreaSearch?: (city: string, area: string) => void;
  loading?: boolean;
}

const RADIUS_OPTIONS = [
  { value: '1', label: '1 km' },
  { value: '2', label: '2 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
  { value: '20', label: '20 km' },
  { value: '50', label: '50 km' },
];

const CITY_OPTIONS = [
  { value: '', label: 'Enter city...' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Bengaluru', label: 'Bengaluru' },
  { value: 'Kolkata', label: 'Kolkata' },
];

export default function LocationSearch({ onSearch, onCityAreaSearch, loading = false }: LocationSearchProps) {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [radius, setRadius] = useState('5');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [searchMode, setSearchMode] = useState<'location' | 'city'>('location');

  const handleLocationReceived = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setSearchMode('location');
  };

  const handleLocationSearch = () => {
    if (latitude !== null && longitude !== null && onSearch) {
      onSearch(latitude, longitude, parseFloat(radius));
    }
  };

  const handleCitySearch = async () => {
    if (!city) return;
    if (onCityAreaSearch) {
      onCityAreaSearch(city, area);
      return;
    }

    // Safe fallback: do not fake a city coordinate lookup in the browser.
    // The public API remains authoritative for city/area filtering.
    setSearchMode('city');
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border border-border">
      <h3 className="font-semibold text-foreground">Find Salons Near You</h3>

      <div className="space-y-3">
        {/* Current Location Option */}
        <div className="border-b border-border pb-4">
          <p className="text-sm font-medium text-foreground mb-2">Use Current Location</p>
          <CurrentLocationButton onLocationReceived={handleLocationReceived} disabled={loading} />
        </div>

        {/* City + Area Search Option */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Search by City / Area</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={loading}
              className="px-3 py-2 border border-border rounded-lg bg-white text-foreground"
            >
              {CITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              disabled={loading}
              className="px-3 py-2 border border-border rounded-lg bg-white text-foreground"
              placeholder="Locality / area (optional)"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCitySearch}
            disabled={!city || loading}
            className="flex-shrink-0"
          >
            <Search size={16} />
          </Button>
        </div>

        {/* Radius Selection */}
        {(latitude !== null && longitude !== null) || searchMode === 'location' ? (
          <div className="space-y-2">
            <label htmlFor="radius" className="text-sm font-medium text-foreground">
              Search Radius
            </label>
            <select
              id="radius"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-border rounded-lg bg-white text-foreground"
            >
              {RADIUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              onClick={handleLocationSearch}
              disabled={loading || latitude === null || longitude === null}
              fullWidth
            >
              {loading ? 'Searching...' : 'Find Salons'}
            </Button>
          </div>
        ) : null}
      </div>

      {/* Display current location info */}
      {latitude !== null && longitude !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-900">
          <p className="flex items-center gap-2">
            <MapPin size={14} />
            Location: {latitude.toFixed(4)}, {longitude.toFixed(4)} (Radius: {radius} km)
          </p>
        </div>
      )}
    </div>
  );
}
