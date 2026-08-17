'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { formatDistance, calculateDistance } from '@/utils/distance';
import { MapPin, Phone, Mail, Globe, Star, Check, Navigation } from 'lucide-react';

interface Salon {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  address: {
    addressLine1: string;
    addressLine2?: string;
    area?: string;
    landmark?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email?: string;
    website?: string;
  };
  openingHours: {
    [key: string]: {
      isOpen: boolean;
      openTime?: string;
      closeTime?: string;
    };
  };
  facilities: string[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isActive: boolean;
  owner: {
    _id: string;
    name: string;
  };
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SalonDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { latitude: userLat, longitude: userLng } = useCurrentLocation();

  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate distance as derived state using useMemo
  const distance = useMemo(() => {
    if (salon && userLat !== null && userLng !== null && salon.location?.coordinates) {
      const [salonLng, salonLat] = salon.location.coordinates;
      return calculateDistance(userLat, userLng, salonLat, salonLng);
    }
    return null;
  }, [salon, userLat, userLng]);

  useEffect(() => {
    const fetchSalon = async () => {
      try {
        setLoading(true);
        setError(null);

        // First get salon by slug from /api/salons listing
        const listResponse = await fetch(`/api/salons?search=${encodeURIComponent(slug)}`);
        const listData = await listResponse.json();

        if (listData.success && listData.data.length > 0) {
          const foundSalon = listData.data.find((s: Salon) => s.slug === slug);
          if (foundSalon) {
            setSalon(foundSalon);
            return;
          }
        }

        setError('Salon not found');
      } catch (error) {
        setError('Failed to load salon');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchSalon();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !salon) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card className="bg-red-50 border-red-200 p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Salon Not Found</h1>
            <p className="text-red-500 mb-6">{error || 'This salon could not be found'}</p>
            <Link href="/salons">
              <Button variant="primary">
                Back to Salons
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Cover Image */}
      {salon.coverImage && (
        <div className="h-96 bg-gray-200 overflow-hidden">
          <img
            src={salon.coverImage}
            alt={salon.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-12">
          {/* Logo */}
          {salon.logo && (
            <div className="md:w-48 h-48 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={salon.logo}
                alt={salon.name}
                className="w-full h-full object-cover"                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}              />
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">{salon.name}</h1>
                <div className="flex items-center gap-3">
                  <div className="flex items-center text-yellow-500">
                    <Star size={20} fill="currentColor" />
                    <span className="ml-1 text-lg font-semibold">{salon.rating}</span>
                  </div>
                  <span className="text-foreground-secondary">({salon.reviewCount} reviews)</span>
                  {salon.isVerified && (
                    <Badge variant="success">
                      <Check size={16} className="mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {salon.description && (
              <p className="text-foreground-secondary text-lg mb-6">{salon.description}</p>
            )}

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Book Appointment</Button>
              <Button variant="ghost">Share</Button>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Address Section */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">Location</h2>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <MapPin size={20} className="text-brand-pink flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{salon.address.addressLine1}</p>
                    {salon.address.addressLine2 && (
                      <p className="text-foreground-secondary">{salon.address.addressLine2}</p>
                    )}
                    {salon.address.area && (
                      <p className="text-foreground-secondary">{salon.address.area}</p>
                    )}
                    <p className="text-foreground-secondary">
                      {salon.address.city}, {salon.address.state} {salon.address.postalCode}
                    </p>
                    {salon.address.landmark && (
                      <p className="text-sm text-foreground-secondary">Landmark: {salon.address.landmark}</p>
                    )}
                    {distance !== null && (
                      <p className="text-sm text-brand-pink font-medium mt-2">
                        📍 {formatDistance(distance)} away
                      </p>
                    )}
                  </div>
                </div>
                {salon.location?.coordinates && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const [lng, lat] = salon.location!.coordinates;
                        const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(
                          salon.address.addressLine1 + ' ' + salon.address.city
                        )}/@${lat},${lng},15z`;
                        window.open(googleMapsUrl, '_blank');
                      }}
                    >
                      <Navigation size={16} className="mr-2" />
                      Get Directions
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Contact Section */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">Contact</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone size={20} className="text-brand-pink" />
                  <a href={`tel:${salon.contact.phone}`} className="text-brand-pink hover:text-brand-pink-hover">
                    {salon.contact.phone}
                  </a>
                </div>
                {salon.contact.email && (
                  <div className="flex items-center gap-3">
                    <Mail size={20} className="text-brand-pink" />
                    <a href={`mailto:${salon.contact.email}`} className="text-brand-pink hover:text-brand-pink-hover">
                      {salon.contact.email}
                    </a>
                  </div>
                )}
                {salon.contact.website && (
                  <div className="flex items-center gap-3">
                    <Globe size={20} className="text-brand-pink" />
                    <a
                      href={salon.contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-pink hover:text-brand-pink-hover"
                    >
                      {salon.contact.website}
                    </a>
                  </div>
                )}
              </div>
            </Card>

            {/* Opening Hours */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">Hours</h2>
              <div className="space-y-2">
                {DAYS.map((day, index) => {
                  const hours = salon.openingHours[day];
                  return (
                    <div key={day} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                      <span className="font-medium text-foreground">{DAY_NAMES[index]}</span>
                      <span className="text-foreground-secondary">
                        {hours.isOpen ? `${hours.openTime} - ${hours.closeTime}` : 'Closed'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Facilities */}
            {salon.facilities.length > 0 && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold text-foreground mb-4">Facilities</h2>
                <div className="flex flex-wrap gap-2">
                  {salon.facilities.map((facility) => (
                    <Badge key={facility} variant="info">
                      {facility}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick Info</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-foreground-secondary mb-1">Owner</p>
                  <p className="font-semibold text-foreground">{salon.owner.name}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary mb-1">Status</p>
                  <Badge variant={salon.isActive ? 'success' : 'error'}>
                    {salon.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <Button variant="primary" fullWidth>
                  Book Appointment
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
