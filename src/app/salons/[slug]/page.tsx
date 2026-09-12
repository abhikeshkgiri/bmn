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

interface Service {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  duration: number;
  price: number;
  discountPrice?: number;
  image?: string;
  isActive?: boolean;
}

interface Barber {
  _id: string;
  name: string;
  slug?: string;
  profileImage?: string;
  bio?: string;
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

export default function SalonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { latitude: userLat, longitude: userLng } = useCurrentLocation();

  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

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

        const listResponse = await fetch(`/api/salons?slug=${encodeURIComponent(slug)}`);
        const listData = await listResponse.json();

        if (listData.success && listData.data.length > 0) {
          const foundSalon = listData.data.find((s: Salon) => s.slug === slug.toLowerCase());
          if (foundSalon) {
            setSalon(foundSalon);

            try {
              const serviceResponse = await fetch(`/api/services?salonId=${foundSalon._id}&isActive=true&limit=50`);
              const servicePayload = await serviceResponse.json();
              if (servicePayload.success) {
                setServices(servicePayload.data || []);
                if ((servicePayload.data || []).length > 0) {
                  setSelectedServiceId(servicePayload.data[0]._id);
                }
              }

              const barberResponse = await fetch(`/api/barbers?salonId=${foundSalon._id}&isActive=true&limit=50`);
              const barberPayload = await barberResponse.json();
              if (barberPayload.success) {
                setBarbers(barberPayload.data || []);
                if ((barberPayload.data || []).length > 0) {
                  setSelectedBarberId(barberPayload.data[0]._id);
                }
              }
            } catch (fetchError) {
              console.error('Failed to fetch service or barber catalog:', fetchError);
            }

            if (new URLSearchParams(window.location.search).get('book') === '1') {
              router.replace(`/book/${foundSalon.slug}`);
              return;
            }
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
  }, [router, slug]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!salon || !selectedServiceId || !selectedBarberId || !selectedDate) {
        setAvailabilitySlots([]);
        return;
      }

      try {
        setAvailabilityLoading(true);
        const response = await fetch(
          `/api/bookings/availability?salonId=${salon._id}&barberId=${selectedBarberId}&serviceId=${selectedServiceId}&date=${selectedDate}`
        );
        const result = await response.json();
        if (result?.success && Array.isArray(result.data?.slots)) {
          setAvailabilitySlots(result.data.slots.filter((slot: AvailabilitySlot) => slot.available));
        } else {
          setAvailabilitySlots([]);
        }
      } catch (err) {
        console.error('Failed to fetch booked availability:', err);
        setAvailabilitySlots([]);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
  }, [salon, selectedBarberId, selectedDate, selectedServiceId]);

  const selectedService = services.find((service) => service._id === selectedServiceId) || services[0] || null;
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
      {(salon.coverImage || salon.logo || '/salon-placeholder.svg') && (
        <div className="h-96 bg-gray-200 overflow-hidden">
          <img
            src={salon.coverImage || salon.logo || '/salon-placeholder.svg'}
            alt={salon.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/salon-placeholder.svg';
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-12">
          {/* Logo */}
          <div className="md:w-48 h-48 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={salon.logo || salon.coverImage || '/salon-placeholder.svg'}
              alt={salon.name}
              className="w-full h-full object-cover"
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
              <Button variant="primary" onClick={() => router.push(`/book/${salon.slug}`)}>Book Appointment</Button>
              <FavoriteButton targetType="SALON" targetId={salon._id} />
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
            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Services & Barbers</h2>
                  <p className="text-sm text-foreground-secondary">Service prices, duration, matching barbers, and live availability</p>
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
                        onClick={() => setSelectedServiceId(service._id)}
                        className={`w-full flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition ${selectedServiceId === service._id ? 'border-brand-pink bg-brand-pink/5' : 'border-border hover:bg-muted'}`}
                      >
                        <span>
                          <span className="block font-semibold text-foreground">{service.name}</span>
                          <span className="block text-xs text-foreground-secondary">
                            {service.duration} min · {service.category || 'Salon service'}
                          </span>
                        </span>
                        <span className="font-semibold text-foreground">
                          {service.discountPrice ? formatCurrency(service.discountPrice) : formatCurrency(service.price)}
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
                      <p className="text-sm text-foreground-secondary">No active barbers are offering this service.</p>
                    )}
                    {qualifiedBarbers.map((barber) => (
                      <button
                        key={barber._id}
                        type="button"
                        onClick={() => setSelectedBarberId(barber._id)}
                        className={`w-full flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition ${selectedBarberId === barber._id ? 'border-brand-pink bg-brand-pink/5' : 'border-border hover:bg-muted'}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="h-10 w-10 rounded-full bg-cover bg-center border border-border" style={{ backgroundImage: `url(${barber.profileImage || '/salon-placeholder.svg'})` }} />
                          <span>
                            <span className="block font-semibold text-foreground">{barber.name}</span>
                            <span className="block text-xs text-foreground-secondary">
                              {barber.specializations?.length ? barber.specializations.join(' · ') : 'Salon expert'}
                            </span>
                          </span>
                        </span>
                        <span className="text-xs text-foreground-secondary">
                          {barber.rating ? `${barber.rating} ★` : 'Profile'}
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
                      <span className="text-sm text-foreground-secondary">No available slots returned for this service and barber.</span>
                    )}
                  </div>
                </div>

                {selectedService && (
                  <div className="rounded-xl bg-muted px-4 py-3">
                    <span className="text-sm text-foreground-secondary">Selected service</span>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-foreground">{selectedService.name}</span>
                      <span className="font-semibold text-brand-pink">{formatCurrency(selectedService.price)}</span>
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
                <Button variant="primary" fullWidth onClick={() => router.push(`/book/${salon.slug}`)}>
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
