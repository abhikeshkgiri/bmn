/**
 * Nearby Salons Component for Dashboard
 * Shows salons near the customer's location
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import { useAutoLocation } from '@/hooks/useAutoLocation';
import GoogleMap, { type MapSalon } from '@/components/location/GoogleMap';
import { Star, MapPin, Map } from 'lucide-react';
import { formatDistance } from '@/utils/distance';

interface Salon extends MapSalon {
  description?: string;
  logo?: string;
  isVerified: boolean;
  reviewCount: number;
}

export default function NearbySalons() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { latitude, longitude } = useAutoLocation();

  useEffect(() => {
    const fetchNearbySalons = async () => {
      if (latitude === null || longitude === null) {
        setError('Location not available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          lat: String(latitude),
          lng: String(longitude),
          radius: '5',
          limit: '6',
        });

        const response = await fetch(`/api/salons/nearby?${params}`);
        const data = await response.json();

        if (data.success) {
          setSalons(data.data.salons || []);
        } else {
          setError('Failed to load nearby salons');
        }
      } catch (err) {
        console.error('Error fetching nearby salons:', err);
        setError('Failed to load nearby salons');
      } finally {
        setLoading(false);
      }
    };

    fetchNearbySalons();
  }, [latitude, longitude]);

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

  if (error || salons.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-foreground mb-4">Salons Near You</h2>
        <div className="text-center py-8 text-foreground-secondary">
          <p className="mb-4">{error || 'No salons found near your location'}</p>
          <Link href="/salons">
            <Button variant="primary">Browse All Salons</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">Salons Near You</h2>
        {salons.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? 'Hide Map' : <Map size={18} />}
          </Button>
        )}
      </div>

      {/* Map View */}
      {showMap && latitude !== null && longitude !== null && (
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
                  {salon.isVerified && (
                    <Badge variant="success" className="ml-2 flex-shrink-0 text-xs">
                      ✓
                    </Badge>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center text-yellow-500">
                    <Star size={14} fill="currentColor" />
                    <span className="ml-1 text-sm font-semibold">{salon.rating}</span>
                  </div>
                  <span className="text-xs text-foreground-secondary">
                    ({salon.reviewCount})
                  </span>
                </div>

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
      <Link href="/salons">
        <Button variant="ghost" fullWidth className="mt-2">
          View All Salons
        </Button>
      </Link>
    </Card>
  );
}
