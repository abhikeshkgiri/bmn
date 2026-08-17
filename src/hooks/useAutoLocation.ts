/**
 * Hook to detect user's current location on component mount
 * Optionally requests permission automatically
 */

import { useEffect, useRef } from 'react';
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
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (autoRequest && !hasRequestedRef.current && !location.latitude && !location.error) {
      hasRequestedRef.current = true;
      location.requestLocation();
    }
  }, [autoRequest, location]);

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    error: location.error,
    loading: location.loading,
    requestPermission: location.requestLocation,
  };
}
