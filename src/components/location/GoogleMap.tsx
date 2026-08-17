/**
 * Google Maps Component
 * Displays a Google Map with salon markers
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, getGoogleMaps } from '@/lib/google-maps';
import Button from '@/components/ui/Button';
import { MapPin } from 'lucide-react';

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

export default function GoogleMap({
  salons,
  center,
  onSalonClick,
  height = '400px',
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    const initializeMap = async () => {
      try {
        setLoading(true);
        setError(null);

        await loadGoogleMaps();
        const gmaps = getGoogleMaps() as any;

        if (!gmaps || !mapRef.current) {
          throw new Error('Google Maps not available');
        }

        const defaultCenter = center
          ? { lat: center.latitude, lng: center.longitude }
          : { lat: 28.7041, lng: 77.1025 }; // Default to Delhi

        const mapInstance = new gmaps.Map(mapRef.current, {
          zoom: 13,
          center: defaultCenter,
          mapTypeControl: true,
          fullscreenControl: true,
          streetViewControl: false,
        });

        setMap(mapInstance);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load Google Maps';
        setError(message);
        console.error('Map initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeMap();
  }, [center]);

  // Add markers
  useEffect(() => {
    if (!map || !salons.length) {
      // Clear markers
      markers.forEach((marker) => marker.setMap(null));
      setMarkers([]);
      return;
    }

    const gmaps = getGoogleMaps() as any;
    if (!gmaps) return;

    // Clear old markers
    markers.forEach((marker) => marker.setMap(null));
    const newMarkers: any[] = [];

    salons.forEach((salon) => {
      const [lng, lat] = salon.location.coordinates;

      const marker = new gmaps.Marker({
        position: { lat, lng },
        map,
        title: salon.name,
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
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
          <h4 style="margin: 0 0 4px 0; font-weight: 600;">${salon.name}</h4>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">
            ${salon.address.area || salon.address.city}
          </p>
          ${
            salon.rating
              ? `<p style="margin: 4px 0; font-size: 12px;">⭐ ${salon.rating.toFixed(1)}</p>`
              : ''
          }
          ${
            salon.distance
              ? `<p style="margin: 4px 0; font-size: 12px; color: #FF2D7A; font-weight: 500;">
                  Distance: ${(salon.distance / 1000).toFixed(1)} km
                </p>`
              : ''
          }
        </div>
      `;

      const infoWindow = new gmaps.InfoWindow({
        content: infoWindowContent,
      });

      marker.addListener('click', () => {
        // Close other info windows
        // In a real implementation, you'd track all info windows
        infoWindow.open(map, marker);

        // Call callback
        if (onSalonClick) {
          onSalonClick(salon);
        }
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Fit bounds if there are salons
    if (newMarkers.length > 0) {
      const bounds = new gmaps.LatLngBounds();

      if (center) {
        bounds.extend({ lat: center.latitude, lng: center.longitude });
      }

      salons.forEach((salon) => {
        const [lng, lat] = salon.location.coordinates;
        bounds.extend({ lat, lng });
      });

      map.fitBounds(bounds, { padding: 50 });
    }

    return () => {
      newMarkers.forEach((marker) => marker.setMap(null));
    };
  }, [map, salons, onSalonClick]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
        <MapPin size={32} className="text-red-600 mb-2" />
        <p className="text-red-600 font-medium">Failed to load map</p>
        <p className="text-sm text-red-500 mt-1">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-brand-pink border-r-transparent rounded-full animate-spin mb-2" />
          <p className="text-foreground-secondary">Loading map...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} style={{ width: '100%', height }} className="rounded-lg border border-border" />;
}
