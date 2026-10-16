'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { formatDistance, calculateDistance } from '@/utils/distance';
import { formatCurrency } from '@/utils/currency';
import { MapPin, Star, Check, Navigation, Clock, UserRound, ArrowRight } from 'lucide-react';
import { FavoriteButton } from '@/components/customer/FavoriteButton';
import { PublicReviewList } from '@/components/reviews/PublicReviewList';

interface Salon {
  _id: string;
  name: string;
  slug: string;
  salonType?: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  images: string[];
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  address: {
    addressLine1?: string;
    addressLine2?: string;
    area?: string;
    landmark?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  openingHours: Partial<{
    [key: string]: {
      isOpen: boolean;
      openTime?: string;
      closeTime?: string;
    };
  }>;
  facilities: string[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isDemoPreview: boolean;
  services: Service[];
  barbers: Barber[];
}

interface Service {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  duration: number;
  price: number;
  discountPrice?: number;
  image?: string;
}

interface Barber {
  _id: string;
  name: string;
  title?: string;
  slug?: string;
  profileImage?: string;
  bio?: string;
  experienceYears: number;
  rating?: number;
  reviewCount?: number;
  isDemoPreview?: boolean;
  isAvailable?: boolean;
  isVerified?: boolean;
  isActive?: boolean;
  specializations?: string[];
  services?: Array<{ _id: string; name: string; duration?: number; price?: number }>;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SalonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { latitude: userLat, longitude: userLng } = useCurrentLocation();

  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);

  // Calculate distance as derived state using useMemo
  const distance = useMemo(() => {
    if (
      salon &&
      userLat !== null &&
      userLng !== null &&
      salon.location?.coordinates?.length === 2 &&
      Number.isFinite(salon.location.coordinates[0]) &&
      Number.isFinite(salon.location.coordinates[1]) &&
      Math.abs(salon.location.coordinates[0]) <= 180 &&
      Math.abs(salon.location.coordinates[1]) <= 90
    ) {
      const [salonLng, salonLat] = salon.location.coordinates;
      return calculateDistance(userLat, userLng, salonLat, salonLng);
    }
    return null;
  }, [salon, userLat, userLng]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchSalon = async () => {
      setSalon(null);
      setServices([]);
      setBarbers([]);
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/salons/${encodeURIComponent(slug)}`, {
          signal: controller.signal,
        });
        const result = await response.json();

        if (!response.ok || !result.success || !result.data) {
          setError(response.status === 404 ? 'This salon could not be found or is unavailable.' : 'Unable to load salon details. Please try again.');
          return;
        }

        const foundSalon = result.data as Salon;
        setSalon(foundSalon);
        setServices(Array.isArray(foundSalon.services) ? foundSalon.services : []);
        setBarbers(Array.isArray(foundSalon.barbers) ? foundSalon.barbers : []);
        if (new URLSearchParams(window.location.search).get('book') === '1') {
          router.replace(`/book/${foundSalon.slug}`);
        }
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setError('Unable to load salon details. Please try again.');
          console.error('Failed to load salon details:', fetchError);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    if (slug) {
      fetchSalon();
    }
    return () => controller.abort();
  }, [retryKey, router, slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !salon) {
    const salonNotFound = error?.includes('not be found') ?? false;
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {salonNotFound ? 'Salon Not Found' : 'Salon Unavailable'}
            </h1>
            {salonNotFound ? (
              <div className="mb-6 space-y-3 text-left text-sm text-foreground-secondary">
                <p>{error}</p>
                <p>If you are opening a demo salon, it must first be seeded into the development database your app uses.</p>
                <pre className="overflow-x-auto rounded-lg bg-neutral-100 p-3 text-xs text-foreground">
                  npm.cmd run seed:feature22-demo -- seed --confirm-database &lt;dev-db-name&gt;
                </pre>
                <p>Reload this page after seeding, then sign in with a customer account to continue booking.</p>
              </div>
            ) : (
              <p className="text-foreground-secondary mb-6">{error || 'This salon could not be found.'}</p>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              {error && !error.includes('not be found') && (
                <Button variant="primary" onClick={() => setRetryKey((key) => key + 1)}>
                  Retry
                </Button>
              )}
              <Link href="/salons">
                <Button variant="secondary">Back to Salons</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Cover Image */}
      <div className="h-56 bg-gray-200 overflow-hidden sm:h-72 lg:h-96">
        <img
          src={salon.coverImage || salon.logo || '/salon-placeholder.svg'}
          alt={salon.coverImage || salon.logo ? `${salon.name} cover photo` : 'Salon image unavailable'}
          className="w-full h-full object-cover"
          loading="eager"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = '/salon-placeholder.svg';
          }}
        />
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Link href="/salons" className="mb-6 inline-flex text-sm font-medium text-brand-pink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          Back to salon discovery
        </Link>
        {salon.images.length > 0 && (
          <section aria-label="Salon gallery" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {salon.images.map((image, index) => (
              <img
                key={`${image}-${index}`}
                src={image}
                alt={`${salon.name} gallery photo ${index + 1}`}
                className="h-32 w-full rounded-lg bg-muted object-cover sm:h-40"
                loading="lazy"
              />
            ))}
          </section>
        )}

        {/* Header */}
        <div className="mb-8 flex flex-col gap-6 md:flex-row">
          {/* Logo */}
          <div className="h-36 w-36 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 md:h-48 md:w-48">
            <img
              src={salon.logo || salon.coverImage || '/salon-placeholder.svg'}
              alt={salon.logo ? `${salon.name} logo` : `${salon.name} image`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/salon-placeholder.svg';
              }}
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">{salon.name}</h1>
                {salon.salonType && <p className="mb-2 text-sm font-medium uppercase tracking-wide text-foreground-secondary">{salon.salonType.replace(/_/g, ' ')}</p>}
                <div className="flex items-center gap-3">
                  {!salon.isDemoPreview && salon.rating > 0 && (
                    <div className="flex items-center text-yellow-500">
                      <Star size={20} fill="currentColor" />
                      <span className="ml-1 text-lg font-semibold">{salon.rating}</span>
                    </div>
                  )}
                  {!salon.isDemoPreview && salon.reviewCount > 0 && (
                    <span className="text-foreground-secondary">({salon.reviewCount} reviews)</span>
                  )}
                  {salon.isDemoPreview ? (
                    <Badge variant="info">Demo preview</Badge>
                  ) : salon.isVerified && (
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
            {salon.isDemoPreview && (
              <p role="note" className="mb-6 rounded-xl border border-info-200 bg-info-50 p-4 text-sm text-info-700">
                Demo preview only. This business, staff, services, prices, and availability are illustrative, not a real operating salon or live appointment offer.
              </p>
            )}

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => router.push(`/book/${encodeURIComponent(salon.slug)}`)}>
                {salon.isDemoPreview ? 'Preview booking flow' : 'Book Appointment'}
              </Button>
              <FavoriteButton targetType="SALON" targetId={salon._id} />
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
                {salon.location?.coordinates?.length === 2 &&
                  Number.isFinite(salon.location.coordinates[0]) &&
                  Number.isFinite(salon.location.coordinates[1]) &&
                  Math.abs(salon.location.coordinates[0]) <= 180 &&
                  Math.abs(salon.location.coordinates[1]) <= 90 && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const [lng, lat] = salon.location!.coordinates;
                        const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(
                          `${salon.address.addressLine1} ${salon.address.city}`
                        )}/@${lat},${lng},15z`;
                        window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <Navigation size={16} className="mr-2" />
                      Get Directions
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Opening Hours */}
            <Card className="p-6">
              <details>
                <summary className="cursor-pointer list-none text-lg font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-pink">
                  Opening hours <span className="ml-2 text-sm font-normal text-foreground-secondary">View weekly schedule</span>
                </summary>
                <div className="mt-3 divide-y divide-border">
                  {DAYS.map((day, index) => {
                    const hours = salon.openingHours?.[day];
                    return (
                      <div key={day} className="flex justify-between gap-4 py-2 text-sm">
                        <span className="font-medium text-foreground">{DAY_NAMES[index]}</span>
                        <span className="text-right text-foreground-secondary">
                          {!hours
                            ? 'Hours not provided'
                            : hours.isOpen
                              ? hours.openTime && hours.closeTime
                                ? `${hours.openTime} - ${hours.closeTime}`
                                : 'Hours not provided'
                              : 'Closed'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </details>
            </Card>

            {/* Services and team */}
            <Card className="p-6">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-foreground">Services & Barbers</h2>
                <p className="mt-1 text-sm text-foreground-secondary">Choose a service to start booking. Select your barber and time on the next step.</p>
              </div>

              <div className="space-y-6">
                <section className="space-y-3" aria-labelledby="salon-services-heading">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-brand-pink" />
                    <h3 id="salon-services-heading" className="font-semibold text-foreground">Services</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {services.length === 0 && (
                      <p className="text-sm text-foreground-secondary">No services are currently published.</p>
                    )}
                    {services.map((service) => (
                      <article
                        key={service._id}
                        className="flex flex-col justify-between gap-4 rounded-xl border border-border p-4"
                      >
                        <div>
                          <h4 className="font-semibold text-foreground">{service.name}</h4>
                          <p className="mt-1 text-xs text-foreground-secondary">
                            {service.duration > 0 ? `${service.duration} min` : 'Duration not provided'}
                            {service.category ? ` · ${service.category.replace(/_/g, ' ')}` : ''}
                          </p>
                          {service.description && (
                            <p className="mt-2 text-sm text-foreground-secondary">{service.description}</p>
                          )}
                          <p className="mt-3 text-lg font-bold text-brand-pink">
                            {formatCurrency(service.discountPrice !== undefined && service.discountPrice <= service.price
                              ? service.discountPrice
                              : service.price)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/book/${encodeURIComponent(salon.slug)}?serviceId=${encodeURIComponent(service._id)}`)}
                        >
                          Book this service <ArrowRight size={16} className="ml-2" />
                        </Button>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="space-y-3" aria-labelledby="salon-barbers-heading">
                  <div className="flex items-center gap-2">
                    <UserRound size={16} className="text-brand-pink" />
                    <h3 id="salon-barbers-heading" className="font-semibold text-foreground">Our professionals</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {barbers.length === 0 && (
                      <p className="text-sm text-foreground-secondary">No active professionals are listed yet.</p>
                    )}
                    {barbers.map((barber) => (
                      <article
                        key={barber._id}
                        className="flex items-center gap-3 rounded-xl border border-border p-4"
                      >
                        <img
                          src={barber.profileImage || '/salon-placeholder.svg'}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-full border border-border bg-muted object-cover"
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-foreground">{barber.name}</h4>
                          {barber.title && <p className="text-xs text-foreground-secondary">{barber.title}</p>}
                          <p className="mt-1 text-xs text-foreground-secondary">
                            {barber.specializations?.length
                              ? barber.specializations.map((specialization) => specialization.replace(/_/g, ' ')).join(' · ')
                              : 'Salon expert'}
                          </p>
                          {barber.experienceYears > 0 && (
                            <p className="mt-1 text-xs text-foreground-secondary">
                              {barber.experienceYears} {barber.experienceYears === 1 ? 'year' : 'years'} experience
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </Card>

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
            <PublicReviewList endpoint={`/api/salons/${salon._id}/reviews`} title="Customer reviews" />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">Ready to book?</h3>
              <div className="space-y-4">
                <p className="text-sm text-foreground-secondary">
                  Pick a service, then choose a barber and a live time slot in the booking flow.
                </p>
                <Button variant="primary" fullWidth onClick={() => router.push(`/book/${encodeURIComponent(salon.slug)}`)}>
                  {salon.isDemoPreview ? 'Preview booking flow' : 'Choose a service and book'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
