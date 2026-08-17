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
  { value: '', label: 'Enter city or area...' },
  { value: 'delhi', label: 'Delhi' },
  { value: 'mumbai', label: 'Mumbai' },
  { value: 'bangalore', label: 'Bangalore' },
  { value: 'hyderabad', label: 'Hyderabad' },
  { value: 'pune', label: 'Pune' },
  { value: 'kolkata', label: 'Kolkata' },
  { value: 'chennai', label: 'Chennai' },
  { value: 'jaipur', label: 'Jaipur' },
  { value: 'lucknow', label: 'Lucknow' },
];

export default function LocationSearch({ onSearch, loading = false }: LocationSearchProps) {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [radius, setRadius] = useState('5');
  const [city, setCity] = useState('');
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
    if (!city || !onSearch) return;

    try {
      // Use browser Geolocation API or a geocoding service
      // For now, we'll use approximate coordinates for major cities
      const cityCoords: Record<string, [number, number]> = {
        delhi: [28.7041, 77.1025],
        mumbai: [19.076, 72.8479],
        bangalore: [12.9716, 77.5946],
        hyderabad: [17.3850, 78.4867],
        pune: [18.5204, 73.8567],
        kolkata: [22.5726, 88.3639],
        chennai: [13.0827, 80.2707],
        jaipur: [26.9124, 75.7873],
        lucknow: [26.8467, 80.946],
      };

      const coords = cityCoords[city.toLowerCase()];
      if (coords) {
        const [lat, lng] = coords;
        setLatitude(lat);
        setLongitude(lng);
        setSearchMode('location');
        onSearch(lat, lng, parseFloat(radius));
      }
    } catch (error) {
      console.error('Error searching city:', error);
    }
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

        {/* City/Area Search Option */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Or Search by City</p>
          <div className="flex gap-2">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={loading}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-white text-foreground"
            >
              {CITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
