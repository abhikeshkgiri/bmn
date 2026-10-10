/**
 * Current Location Button Component
 * Requests browser geolocation permission and displays current location
 */

'use client';

import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import Button from '@/components/ui/Button';
import { MapPin } from 'lucide-react';

interface CurrentLocationButtonProps {
  onLocationReceived?: (lat: number, lng: number) => void;
  disabled?: boolean;
}

export default function CurrentLocationButton({
  onLocationReceived,
  disabled = false,
}: CurrentLocationButtonProps) {
  const { latitude, longitude, error, loading, requestLocation } = useCurrentLocation();

  const handleClick = () => {
    requestLocation();
  };

  const handleUseLocation = () => {
    if (latitude !== null && longitude !== null && onLocationReceived) {
      onLocationReceived(latitude, longitude);
    }
  };

  if (error) {
    return (
      <div className="space-y-2" role="alert">
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" size="sm" onClick={handleClick} disabled={disabled}>
          <MapPin size={16} className="mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (latitude !== null && longitude !== null) {
    return (
      <div className="space-y-2" role="status">
        <p className="text-sm text-green-600">Location detected. Your coordinates are not displayed.</p>
        {onLocationReceived && (
          <Button variant="primary" size="sm" onClick={handleUseLocation} disabled={disabled}>
            Use This Location
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled || loading}
      className="w-full"
    >
      {loading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin mr-2" />
          Detecting location...
        </>
      ) : (
        <>
          <MapPin size={16} className="mr-2" />
          Use My Current Location
        </>
      )}
    </Button>
  );
}
