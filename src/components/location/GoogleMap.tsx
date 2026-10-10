/**
 * Google Maps Component
 * Displays a Google Map with salon markers
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, getGoogleMaps } from '@/lib/google-maps';
import { MapPin } from 'lucide-react';
import { isValidCoordinates } from '@/utils/distance';
import Button from '@/components/ui/Button';

export interface MapSalon {
  _id: string;
  name: string;
  slug: string;
  address: {
    area?: string;
    city: string;
  };
  location: {
    coordinates: [number, number];
  };
  rating: number;
  distance?: number;
}

interface GoogleMapProps {
  salons: MapSalon[];
  center?: { latitude: number; longitude: number };
  onSalonClick?: (salon: MapSalon) => void;
  height?: string;
}

interface MapMarker {
  setMap: (map: unknown) => void;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

export default function GoogleMap({
  salons,
  center,
  onSalonClick,
  height = '400px',
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<MapMarker[]>([]);
  const mapInstanceRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Initialize map
  useEffect(() => {
    let cancelled = false;
    const initializeMap = async () => {
      try {
        setLoading(true);
        setMapReady(false);
        setError(null);

        await loadGoogleMaps();
        if (cancelled) return;
        const gmaps = getGoogleMaps();

        if (!gmaps || !mapRef.current) {
          throw new Error('Google Maps not available');
        }

        const defaultCenter = center
          ? { lat: center.latitude, lng: center.longitude }
          : { lat: 28.7041, lng: 77.1025 }; // Default to Delhi

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapInstance = new (gmaps as any).Map(mapRef.current, {
          zoom: 13,
          center: defaultCenter,
          mapTypeControl: true,
          fullscreenControl: true,
          streetViewControl: false,
        });

        mapInstanceRef.current = mapInstance;
        setMapReady(true);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load Google Maps';
        setError(message);
        console.error('Map initialization error:', err);
        setLoading(false);
      }
    };

    initializeMap();
    return () => {
      cancelled = true;
    };
  }, [center, retryKey]);

  // Update markers when salons change
  useEffect(() => {
    const validSalons = salons.filter((salon) => {
      const [longitude, latitude] = salon.location.coordinates;
      return isValidCoordinates(latitude, longitude);
    });

    if (!mapReady || !mapInstanceRef.current || !validSalons.length) {
      // Clear markers when no salons
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      return;
    }

    const gmaps = getGoogleMaps();
    if (!gmaps) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const newMarkers: MapMarker[] = [];

    validSalons.forEach((salon) => {
      const [lng, lat] = salon.location.coordinates;
      const salonName = escapeHtml(salon.name);
      const salonArea = escapeHtml(salon.address.area || salon.address.city);
      const validDistance = typeof salon.distance === 'number' &&
        Number.isFinite(salon.distance) &&
        salon.distance >= 0
        ? salon.distance
        : null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = new (gmaps as any).Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        title: salon.name,
        icon: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          path: (gmaps as any).SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#FF2D7A',
          fillOpacity: 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      // Create info window
      const infoWindowContent = `
        <div style="padding: 8px; max-width: 200px;">
          <h4 style="margin: 0 0 4px 0; font-weight: 600;">${salonName}</h4>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">
            ${salonArea}
          </p>
          ${
            salon.rating
              ? `<p style="margin: 4px 0; font-size: 12px;">⭐ ${salon.rating.toFixed(1)}</p>`
              : ''
          }
          ${
            validDistance !== null
              ? `<p style="margin: 4px 0; font-size: 12px; color: #FF2D7A; font-weight: 500;">
                  Distance: ${(validDistance / 1000).toFixed(1)} km
                </p>`
              : ''
          }
        </div>
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const infoWindow = new (gmaps as any).InfoWindow({
        content: infoWindowContent,
      });

      marker.addListener('click', () => {
        // Open info window
        infoWindow.open(mapInstanceRef.current, marker);

        // Call callback
        if (onSalonClick) {
          onSalonClick(salon);
        }
      });

      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;

    // Fit bounds if there are salons
    if (newMarkers.length > 0 && mapInstanceRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bounds = new (gmaps as any).LatLngBounds();

      if (center && isValidCoordinates(center.latitude, center.longitude)) {
        bounds.extend({ lat: center.latitude, lng: center.longitude });
      }

      validSalons.forEach((salon) => {
        const [lng, lat] = salon.location.coordinates;
        bounds.extend({ lat, lng });
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapInstanceRef.current as any).fitBounds(bounds, { padding: 50 });
    }
  }, [salons, onSalonClick, center, mapReady]);

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
        <MapPin size={32} className="text-red-600 mb-2" />
        <p className="text-red-600 font-medium">Failed to load map</p>
        <p className="text-sm text-red-500 mt-1">{error}</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => setRetryKey((key) => key + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-brand-pink border-r-transparent rounded-full animate-spin mb-2" />
          <p role="status" className="text-foreground-secondary">Loading map...</p>
        </div>
      </div>
    );
  }
  return <div ref={mapRef} style={{ width: '100%', height }} className="rounded-lg border border-border" />;
}
