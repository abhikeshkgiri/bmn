/**
 * Location Search Component
 * Allows users to search for salons by location
 */

'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import CurrentLocationButton from './CurrentLocationButton';
import { MapPin, Search } from 'lucide-react';
import { SUPPORTED_LAUNCH_CITIES } from '@/constants/launch-cities';
import { isValidCoordinates } from '@/utils/distance';

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

export default function LocationSearch({ onSearch, onCityAreaSearch, loading = false }: LocationSearchProps) {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [radius, setRadius] = useState('5');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [searchMode, setSearchMode] = useState<'location' | 'city'>('location');
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleLocationReceived = (lat: number, lng: number) => {
    if (!isValidCoordinates(lat, lng)) {
      setLocationError('Your device returned invalid coordinates. Choose a supported city and area instead.');
      setLatitude(null);
      setLongitude(null);
      return;
    }
    setLocationError(null);
    setLatitude(lat);
    setLongitude(lng);
    setSearchMode('location');
  };

  const handleLocationSearch = () => {
    if (latitude !== null && longitude !== null && onSearch) {
      if (!isValidCoordinates(latitude, longitude)) {
        setLocationError('The selected coordinates are invalid. Detect your location again or search by city.');
        return;
      }
      setLocationError(null);
      onSearch(latitude, longitude, parseFloat(radius));
    }
  };

  const handleCitySearch = async () => {
    if (!city) return;
    setLatitude(null);
    setLongitude(null);
    setLocationError(null);
    setSearchMode('city');
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
              aria-label="Choose a supported launch city"
              onChange={(e) => setCity(e.target.value)}
              disabled={loading}
              className="px-3 py-2 border border-border rounded-lg bg-white text-foreground"
            >
              <option value="">Choose a launch city</option>
              {SUPPORTED_LAUNCH_CITIES.map(({ city: cityName, state }) => (
                <option key={cityName} value={cityName}>
                  {cityName}, {state}
                </option>
              ))}
            </select>
            <input
              value={area}
              aria-label="Filter by area or locality"
              onChange={(e) => setArea(e.target.value)}
              maxLength={80}
              disabled={loading}
              className="px-3 py-2 border border-border rounded-lg bg-white text-foreground"
              placeholder="Locality / area (optional)"
            />
          </div>
          {city && (
            <p className="text-xs text-foreground-secondary">
              State / UT: {SUPPORTED_LAUNCH_CITIES.find((option) => option.city === city)?.state}
            </p>
          )}
          <Button
            variant="primary"
            size="sm"
            aria-label="Search by city and area"
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

      {locationError && <p role="alert" className="text-sm text-error-600">{locationError}</p>}

      {/* Display current location info */}
      {latitude !== null && longitude !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-900">
          <p className="flex items-center gap-2" role="status">
            <MapPin size={14} />
            Location detected. Search radius: {radius} km.
          </p>
        </div>
      )}
    </div>
  );
}
