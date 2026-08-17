/**
 * Hook to detect user's current location on component mount
 * Optionally requests permission automatically
 */

import { useEffect, useState } from 'react';
import { useCurrentLocation } from './useCurrentLocation';

interface UseAutoLocationReturn {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  requestPermission: () => void;
}

export function useAutoLocation(autoRequest: boolean = false): UseAutoLocationReturn {
  const location = useCurrentLocation();
  const [hasRequested, setHasRequested] = useState(false);

  useEffect(() => {
    if (autoRequest && !hasRequested && !location.latitude && !location.error) {
      setHasRequested(true);
      location.requestLocation();
    }
  }, [autoRequest, hasRequested, location.latitude, location.error, location.requestLocation]);

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    error: location.error,
    loading: location.loading,
    requestPermission: location.requestLocation,
  };
}
