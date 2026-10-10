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
import { MapPin, Phone, Mail, Globe, Star, Check, Navigation, Clock, UserRound } from 'lucide-react';
import { FavoriteButton } from '@/components/customer/FavoriteButton';
import { PublicReviewList } from '@/components/reviews/PublicReviewList';

interface Salon {
  _id: string;
  name: string;
  slug: string;
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
  contact: {
    phone?: string;
    email?: string;
    website?: string;
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
  slug?: string;
  profileImage?: string;
  bio?: string;
  experienceYears: number;
  rating?: number;
  reviewCount?: number;
  isAvailable?: boolean;
  isVerified?: boolean;
  isActive?: boolean;
  specializations?: string[];
  services?: Array<{ _id: string; name: string; duration?: number; price?: number }>;
}

interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getSafeWebsiteUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

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
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(false);

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
      setSelectedServiceId(null);
      setSelectedBarberId(null);
      setAvailabilitySlots([]);
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
        setSelectedServiceId(foundSalon.services?.[0]?._id ?? null);
        setSelectedBarberId(foundSalon.barbers?.[0]?._id ?? null);

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

  useEffect(() => {
    const controller = new AbortController();

    const fetchAvailability = async () => {
      if (!salon || !selectedServiceId || !selectedBarberId || !selectedDate) {
        setAvailabilitySlots([]);
        setAvailabilityError(false);
        setAvailabilityLoading(false);
        return;
      }

      try {
        setAvailabilityLoading(true);
        setAvailabilityError(false);
        const response = await fetch(
          `/api/bookings/availability?salonId=${salon._id}&barberId=${selectedBarberId}&serviceId=${selectedServiceId}&date=${selectedDate}`,
          { signal: controller.signal },
        );
        const result = await response.json();
        if (!response.ok || !result?.success || !Array.isArray(result.data?.slots)) {
          throw new Error('Availability request failed');
        }
        setAvailabilitySlots(
          result.data.slots.filter(
            (slot: AvailabilitySlot) =>
              slot.available &&
              typeof slot.startTime === 'string' &&
              typeof slot.endTime === 'string',
          ),
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to fetch booked availability:', error);
          setAvailabilitySlots([]);
          setAvailabilityError(true);
        }
      } finally {
        if (!controller.signal.aborted) setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
    return () => controller.abort();
  }, [salon, selectedBarberId, selectedDate, selectedServiceId]);

  const selectedService = services.find((service) => service._id === selectedServiceId) || services[0] || null;
  const websiteUrl = getSafeWebsiteUrl(salon?.contact.website);
  const qualifiedBarbers = barbers.filter((barber) => {
    if (!selectedServiceId) return true;
    return !barber.services || barber.services.some((service) => service._id === selectedServiceId);
  });

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
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {error?.includes('not be found') ? 'Salon Not Found' : 'Salon Unavailable'}
            </h1>
            <p className="text-foreground-secondary mb-6">{error || 'This salon could not be found.'}</p>
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
      <div className="max-w-4xl mx-auto px-4 py-8">
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
        <div className="mb-12 flex flex-col gap-6 md:flex-row">
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
                <div className="flex items-center gap-3">
                  {salon.rating > 0 && (
                    <div className="flex items-center text-yellow-500">
                      <Star size={20} fill="currentColor" />
                      <span className="ml-1 text-lg font-semibold">{salon.rating}</span>
                    </div>
                  )}
                  {salon.reviewCount > 0 && (
                    <span className="text-foreground-secondary">({salon.reviewCount} reviews)</span>
                  )}
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
              <Button variant="primary" onClick={() => router.push(`/book/${encodeURIComponent(salon.slug)}`)}>
                Book Appointment
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

            {/* Contact Section */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">Contact</h2>
              <div className="space-y-3">
                {salon.contact.phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={20} className="text-brand-pink" />
                    <a href={`tel:${salon.contact.phone}`} className="text-brand-pink hover:text-brand-pink-hover">
                      {salon.contact.phone}
                    </a>
                  </div>
                )}
                {salon.contact.email && (
                  <div className="flex items-center gap-3">
                    <Mail size={20} className="text-brand-pink" />
                    <a href={`mailto:${salon.contact.email}`} className="text-brand-pink hover:text-brand-pink-hover">
                      {salon.contact.email}
                    </a>
                  </div>
                )}
                {getSafeWebsiteUrl(salon.contact.website) && (
                  <div className="flex items-center gap-3">
                    <Globe size={20} className="text-brand-pink" />
                    {websiteUrl
                      ? (
                        <a
                          href={websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-pink hover:text-brand-pink-hover"
                        >
                          {salon.contact.website}
                        </a>
                      )
                      : <span className="text-foreground-secondary">{salon.contact.website}</span>}
                  </div>
                )}
              </div>
            </Card>

            {/* Opening Hours */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">Hours</h2>
              <div className="space-y-2">
                {DAYS.map((day, index) => {
                  const hours = salon.openingHours?.[day];
                  return (
                    <div key={day} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                      <span className="font-medium text-foreground">{DAY_NAMES[index]}</span>
                      <span className="text-foreground-secondary">
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
            </Card>

            {/* Facilities */}
            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Services & Barbers</h2>
                  <p className="text-sm text-foreground-secondary">Published services and salon professionals</p>
                </div>
                <Button variant="primary" size="sm" onClick={() => router.push(`/book/${salon.slug}`)}>
                  Continue booking
                </Button>
              </div>

              <div className="grid gap-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-brand-pink" />
                    <span className="font-semibold text-foreground">Services</span>
                  </div>
                  <div className="grid gap-2">
                    {services.length === 0 && (
                      <p className="text-sm text-foreground-secondary">No services are currently published.</p>
                    )}
                    {services.map((service) => (
                      <button
                        key={service._id}
                        type="button"
                        aria-pressed={selectedServiceId === service._id}
                        onClick={() => setSelectedServiceId(service._id)}
                        className={`w-full flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition ${selectedServiceId === service._id ? 'border-brand-pink bg-brand-pink/5' : 'border-border hover:bg-muted'}`}
                      >
                        <span>
                          <span className="block font-semibold text-foreground">{service.name}</span>
                          <span className="block text-xs text-foreground-secondary">
                            {service.duration > 0 ? `${service.duration} min` : 'Duration not provided'}
                            {service.category ? ` · ${service.category}` : ''}
                          </span>
                          {service.description && (
                            <span className="mt-1 block text-xs text-foreground-secondary">{service.description}</span>
                          )}
                        </span>
                        <span className="font-semibold text-foreground">
                          {service.discountPrice !== undefined && service.discountPrice <= service.price
                            ? formatCurrency(service.discountPrice)
                            : formatCurrency(service.price)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <UserRound size={16} className="text-brand-pink" />
                    <span className="font-semibold text-foreground">Barbers</span>
                  </div>
                  <div className="grid gap-2">
                    {qualifiedBarbers.length === 0 && (
                      <p className="text-sm text-foreground-secondary">No verified professionals are listed for this service.</p>
                    )}
                    {qualifiedBarbers.map((barber) => (
                      <button
                        key={barber._id}
                        type="button"
                        aria-pressed={selectedBarberId === barber._id}
                        onClick={() => setSelectedBarberId(barber._id)}
                        className={`w-full flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition ${selectedBarberId === barber._id ? 'border-brand-pink bg-brand-pink/5' : 'border-border hover:bg-muted'}`}
                      >
                        <span className="flex items-center gap-3">
                          <img
                            src={barber.profileImage || '/salon-placeholder.svg'}
                            alt=""
                            className="h-10 w-10 rounded-full border border-border bg-muted object-cover"
                            loading="lazy"
                          />
                          <span>
                            <span className="block font-semibold text-foreground">{barber.name}</span>
                            <span className="block text-xs text-foreground-secondary">
                              {barber.specializations?.length ? barber.specializations.join(' · ') : 'Salon expert'}
                            </span>
                            {barber.experienceYears > 0 && (
                              <span className="block text-xs text-foreground-secondary">
                                {barber.experienceYears} {barber.experienceYears === 1 ? 'year' : 'years'} experience
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="text-xs text-foreground-secondary">
                          {barber.rating ? `${barber.rating} ★` : 'Select'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-foreground">Availability</span>
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(event) => setSelectedDate(event.target.value)}
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="mt-3">
                    {availabilityLoading && <Spinner size="sm" />}
                    {!availabilityLoading && availabilitySlots.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {availabilitySlots.map((slot, index) => (
                          <span key={`${slot.startTime}-${index}`} className="rounded-full border border-brand-pink px-3 py-1 text-xs font-medium text-brand-pink">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        ))}
                      </div>
                    )}
                    {!availabilityLoading && availabilitySlots.length === 0 && (
                      <span className="text-sm text-foreground-secondary">
                        {availabilityError
                          ? 'Availability could not be loaded. Continue to booking to check current times.'
                          : 'No available slots returned for this service and barber.'}
                      </span>
                    )}
                  </div>
                </div>

                {selectedService && (
                  <div className="rounded-xl bg-muted px-4 py-3">
                    <span className="text-sm text-foreground-secondary">Selected service</span>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-foreground">{selectedService.name}</span>
                      <span className="font-semibold text-brand-pink">
                        {selectedService.discountPrice !== undefined && selectedService.discountPrice <= selectedService.price
                          ? formatCurrency(selectedService.discountPrice)
                          : formatCurrency(selectedService.price)}
                      </span>
                    </div>
                  </div>
                )}
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
              <h3 className="text-lg font-semibold text-foreground mb-4">Ready to visit?</h3>
              <div className="space-y-4">
                <p className="text-sm text-foreground-secondary">
                  Review services and continue to the salon&apos;s booking page when you&apos;re ready.
                </p>
                <Button variant="primary" fullWidth onClick={() => router.push(`/book/${encodeURIComponent(salon.slug)}`)}>
                  Continue to booking
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
