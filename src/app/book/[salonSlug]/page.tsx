'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import { formatCurrency } from '@/utils/currency';
import { ChevronRight, Check } from 'lucide-react';
import { RazorpayCheckout } from '@/components/payment/RazorpayCheckout';
import { BOOKING_MAX_DAYS_AHEAD } from '@/constants/booking-config';

interface Salon {
  _id: string;
  name: string;
  slug: string;
  isDemoPreview?: boolean;
}

interface Barber {
  _id: string;
  name: string;
  profileImage?: string;
  specializations: string[];
}

interface Service {
  _id: string;
  name: string;
  duration: number;
  price: number;
}

interface CheckoutPrice {
  servicePrice: number;
  subtotal: number;
  membershipDiscount: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  couponCode?: string;
  loyaltyPoints: number;
  membershipPlan?: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface CreatedBooking {
  _id: string;
  bookingNumber: string;
  salon: { name: string };
  service: { name: string; duration: number };
  barber: { name: string };
  appointmentDate: string;
  startTime: string;
  endTime: string;
  servicePrice: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
}

type BookingStep = 'service' | 'barber' | 'schedule' | 'review' | 'payment';

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function BookPage() {
  const router = useRouter();
  const params = useParams();
  const salonSlug = params.salonSlug as string;

  // Step 1: Fetch salon
  const [salon, setSalon] = useState<Salon | null>(null);
  const [salonLoading, setSalonLoading] = useState(true);

  // Booking state
  const [step, setStep] = useState<BookingStep>('service');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [selectedTime, setSelectedTime] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [checkoutPrice, setCheckoutPrice] = useState<CheckoutPrice | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  // Data lists
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [serviceError, setServiceError] = useState('');
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barberLoading, setBarberLoading] = useState(false);
  const [barberError, setBarberError] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [availabilityError, setAvailabilityError] = useState('');
  const availabilityRequestId = useRef(0);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [paymentPreparing, setPaymentPreparing] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [createdBooking, setCreatedBooking] = useState<CreatedBooking | null>(null);
  const [customerProfile, setCustomerProfile] = useState<{ name: string; email?: string; phone?: string } | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    bookingNumber: string;
  } | null>(null);
  const [paymentBookingId, setPaymentBookingId] = useState<string | null>(null);

  const fetchServices = useCallback(async (salonId: string) => {
    setServicesLoading(true);
    setServiceError('');
    try {
      const response = await fetch(`/api/services?salonId=${salonId}&isActive=true`);
      const result = await response.json() as {success: boolean; data?: Service[]; error?: { message?: string }};
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Unable to load salon services.');
      }
      setServices(result.data || []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setServices([]);
      setServiceError(error instanceof Error ? error.message : 'Unable to load salon services.');
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const fetchBarbers = useCallback(async (salonId: string, serviceId: string) => {
    setBarberLoading(true);
    setBarberError('');
    try {
      const response = await fetch(`/api/barbers?salonId=${encodeURIComponent(salonId)}&service=${encodeURIComponent(serviceId)}&isActive=true`);
      const result = await response.json() as {success: boolean; data?: Barber[]; error?: { message?: string }};
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Unable to load available barbers.');
      }
      setBarbers(result.data || []);
    } catch (error) {
      console.error('Failed to fetch barbers:', error);
      setBarbers([]);
      setBarberError(error instanceof Error ? error.message : 'Unable to load available barbers.');
    } finally {
      setBarberLoading(false);
    }
  }, []);

  // Fetch salon on mount
  useEffect(() => {
    const fetchSalon = async () => {
      try {
        const response = await fetch(`/api/salons?slug=${encodeURIComponent(salonSlug)}`);
        const result = await response.json() as {success: boolean; data?: Salon[]};
        if (result.success && result.data?.length) {
          const foundSalon = result.data.find((s: Salon) => s.slug === salonSlug.toLowerCase());
          if (foundSalon) {
            setSalon(foundSalon);
            await fetchServices(foundSalon._id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch salon:', error);
      } finally {
        setSalonLoading(false);
      }
    };

    const fetchCustomerProfile = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const result = await response.json() as { success?: boolean; user?: { name?: string; email?: string; phone?: string } };
        if (result.success && result.user) {
          setCustomerProfile({
            name: result.user.name || 'Customer',
            email: result.user.email || 'customer@example.com',
            phone: result.user.phone || '9999999999',
          });
        }
      } catch {
        setCustomerProfile({
          name: 'Customer',
          email: 'customer@example.com',
          phone: '9999999999',
        });
      }
    };

    fetchSalon();
    fetchCustomerProfile();
  }, [salonSlug, fetchServices]);

  const fetchAvailableSlots = useCallback(async (
    date = selectedDate,
    barber = selectedBarber,
    service = selectedService,
  ) => {
    if (!salon || !barber || !service || !date) return;
    const requestId = ++availabilityRequestId.current;

    try {
      setLoading(true);
      setAvailabilityError('');
      setAvailableSlots([]);
      const response = await fetch(
        `/api/bookings/availability?salonId=${encodeURIComponent(salon._id)}&barberId=${encodeURIComponent(barber._id)}&serviceId=${encodeURIComponent(service._id)}&date=${encodeURIComponent(date)}`
      );
      const result = await response.json() as {
        success?: boolean;
        data?: { slots?: TimeSlot[] };
        error?: { message?: string };
      };
      if (requestId !== availabilityRequestId.current) return;
      if (response.ok && result.success && result.data) {
        setAvailableSlots(result.data.slots || []);
      } else {
        setAvailabilityError(result.error?.message || 'Availability could not be loaded.');
      }
    } catch (error) {
      if (requestId !== availabilityRequestId.current) return;
      console.error('Failed to fetch available slots:', error);
      setAvailabilityError('Availability could not be loaded. Please retry.');
    } finally {
      if (requestId === availabilityRequestId.current) setLoading(false);
    }
  }, [salon, selectedBarber, selectedService, selectedDate]);

  const handleServiceSelect = async (service: Service) => {
    if (servicesLoading) return;
    setSelectedService(service);
    setSelectedBarber(null);
    setSelectedTime('');
    setAvailableSlots([]);
    setStep('barber');
    if (salon) await fetchBarbers(salon._id, service._id);
  };

  const handleBarberSelect = (barber: Barber) => {
    setSelectedBarber(barber);
    setSelectedTime('');
    setStep('schedule');
    void fetchAvailableSlots(selectedDate, barber, selectedService);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('review');
  };

  const previewPrice = async (): Promise<CheckoutPrice | null> => {
    if (!salon || !selectedService) return null;
    setPriceLoading(true);
    try {
      const response = await fetch('/api/checkout/price', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId: salon._id, serviceId: selectedService._id, couponCode: couponCode.trim() || undefined, loyaltyPoints: loyaltyPoints || undefined }),
      });
      const result = await response.json() as { success: boolean; data?: CheckoutPrice; error?: { message?: string } };
      if (!response.ok || !result.success || !result.data) {
        setBookingError(result.error?.message || 'Unable to calculate checkout price. Please retry.');
        return null;
      }
      setCheckoutPrice(result.data);
      return result.data;
    } catch (error) {
      console.error('Failed to calculate checkout price:', error);
      setBookingError('Unable to calculate checkout price. Please retry.');
      return null;
    } finally {
      setPriceLoading(false);
    }
  };

  const preparePayment = async (booking: CreatedBooking) => {
    setPaymentPreparing(true);
    setBookingError('');
    try {
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking._id }),
      });
      const result = await response.json() as {
        success?: boolean;
        data?: { orderId: string; amount: number; currency: string; keyId: string };
        error?: { message?: string };
      };
      if (!response.ok || !result.success || !result.data) {
        setBookingError(result.error?.message || 'Payment could not be prepared. Your booking request is saved; please retry.');
        return;
      }
      setPaymentOrder({ ...result.data, bookingNumber: booking.bookingNumber });
      setPaymentBookingId(booking._id);
      setStep('payment');
    } catch (error) {
      console.error('Failed to prepare payment:', error);
      setBookingError('Payment could not be prepared. Your booking request is saved; please retry.');
    } finally {
      setPaymentPreparing(false);
    }
  };

  const handleBooking = async () => {
    if (createdBooking) {
      await preparePayment(createdBooking);
      return;
    }
    if (!salon || !selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      setBookingError('Please complete all booking steps before continuing.');
      return;
    }

    try {
      setBookingSubmitting(true);
      setBookingError('');
      const price = await previewPrice();
      if (!price) return;
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: salon._id,
          barberId: selectedBarber._id,
          serviceId: selectedService._id,
          appointmentDate: selectedDate,
          startTime: selectedTime,
          bookingType: 'SALON',
          customerNotes: customerNotes || undefined,
          couponCode: couponCode.trim() || undefined,
          loyaltyPoints: loyaltyPoints || undefined,
        }),
      });

      const result = await response.json() as {
        success?: boolean;
        data?: CreatedBooking;
        error?: { message?: string };
      };
      const booking = result.data;
      if (!response.ok || !result.success || !booking?._id || !booking.bookingNumber ||
        !booking.salon?.name || !booking.service?.name || !booking.barber?.name ||
        !Number.isFinite(booking.totalAmount)) {
        setBookingError(result.error?.message || 'Booking could not be created. Please retry.');
        return;
      }
      setCreatedBooking(booking);
      setPaymentBookingId(booking._id);
      await preparePayment(booking);
    } catch (error) {
      console.error('Failed to create booking:', error);
      setBookingError('Booking could not be created. Please check your connection and retry.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    if (!paymentBookingId) return;

    const response = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: paymentBookingId,
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      }),
    });

    const result = await response.json();

    if (result.success) {
      router.push(`/booking/${paymentBookingId}`);
      return;
    }

    alert('Payment verification failed: ' + (result.error?.message || 'Unknown error'));
    throw new Error(result.error?.message || 'Payment verification failed');
  };

  const handlePaymentFailure = async (error: {
    reason?: { order_id?: string };
    order_id?: string;
    error?: { code?: string; description?: string };
    code?: string;
    description?: string;
  }) => {
    if (!paymentBookingId) return;

    await fetch('/api/payments/failure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: paymentBookingId,
        razorpay_order_id: error?.reason?.order_id || error?.order_id || '',
        error_code: error?.error?.code || error?.code,
        error_description: error?.error?.description || error?.description,
      }),
    });
  };

  if (salonLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            <p className="text-foreground-secondary mb-6">Salon not found</p>
            <Link href="/salons">
              <Button variant="primary">Back to Salons</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  // Stepper UI
  const steps: BookingStep[] = ['service', 'barber', 'schedule', 'review', 'payment'];
  const minBookingDate = toDateInputValue(new Date());
  const maxBookingDate = (() => {
    const date = new Date();
    date.setDate(date.getDate() + BOOKING_MAX_DAYS_AHEAD);
    return toDateInputValue(date);
  })();
  const stepLabels: Record<BookingStep, string> = {
    service: 'Service',
    barber: 'Barber',
    schedule: 'Date & time',
    review: 'Review',
    payment: 'Payment',
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {salon.isDemoPreview ? 'Preview booking flow' : 'Book Appointment'}
          </h1>
          <p className="text-foreground-secondary">{salon.name}</p>
        </div>
        {salon.isDemoPreview && (
          <p role="note" className="mb-6 rounded-xl border border-info-200 bg-info-50 p-4 text-sm text-info-700">
            Demo preview only. This is not a real salon; services, prices, availability, and any booking/payment flow are illustrative test data.
          </p>
        )}

        {/* Stepper */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-2 flex-wrap">
            {steps.map((s, index) => (
              <div key={s} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const stepIndex = steps.indexOf(step);
                    if (!createdBooking && index < stepIndex) {
                      setStep(s);
                    }
                  }}
                  disabled={Boolean(createdBooking) || index >= steps.indexOf(step)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                    step === s
                      ? 'bg-brand-pink text-white'
                      : steps.indexOf(s) < steps.indexOf(step)
                        ? 'bg-brand-pink text-white'
                        : 'bg-background text-foreground-secondary'
                  }`}
                >
                  {steps.indexOf(s) < steps.indexOf(step) ? (
                    <Check size={20} />
                  ) : (
                    index + 1
                  )}
                </button>
                <span
                  className={`text-sm font-medium ${
                    step === s || steps.indexOf(s) < steps.indexOf(step)
                      ? 'text-foreground'
                      : 'text-foreground-secondary'
                  }`}
                >
                  {stepLabels[s]}
                </span>
                {index < steps.length - 1 && (
                  <ChevronRight size={20} className="text-foreground-secondary ml-2" />
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Step Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* SERVICE SELECTION */}
            {step === 'service' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground mb-6">Select Service</h2>
                {servicesLoading ? (
                  <Card className="p-8 flex items-center justify-center"><Spinner size="md" /></Card>
                ) : serviceError ? (
                  <Card className="p-6 text-center">
                    <p role="alert" className="text-sm text-red-700">{serviceError}</p>
                    {salon && <Button className="mt-4" variant="outline" onClick={() => void fetchServices(salon._id)}>Retry</Button>}
                  </Card>
                ) : services.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-foreground-secondary">No services available</p>
                  </Card>
                ) : (
                  services.map((service) => (
                    <Card
                      key={service._id}
                      className={`p-6 cursor-pointer transition-all ${
                        selectedService?._id === service._id
                          ? 'border-2 border-brand-pink bg-background'
                          : 'hover:shadow-lg'
                      }`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          void handleServiceSelect(service);
                        }
                      }}
                      onClick={() => handleServiceSelect(service)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg text-foreground">{service.name}</h3>
                          <p className="text-sm text-foreground-secondary mt-1">
                            {service.duration} minutes
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-brand-pink">
                            {formatCurrency(service.price)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* BARBER SELECTION */}
            {step === 'barber' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Choose your barber</h2>
                <p className="text-sm text-foreground-secondary">Pick a barber who offers {selectedService?.name}.</p>
                {barberLoading ? (
                  <Card className="p-8 flex items-center justify-center"><Spinner size="md" /></Card>
                ) : barberError ? (
                  <Card className="p-6 text-center">
                    <p role="alert" className="text-sm text-red-700">{barberError}</p>
                    {selectedService && salon && <Button className="mt-4" variant="outline" onClick={() => void fetchBarbers(salon._id, selectedService._id)}>Retry</Button>}
                  </Card>
                ) : barbers.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="font-medium text-foreground">No bookable barber for this service yet</p>
                    <p className="mt-2 text-sm text-foreground-secondary">The salon owner needs to add an active barber profile that offers this service. Booking opens after salon approval.</p>
                  </Card>
                ) : (
                  barbers.map((barber) => (
                    <Card
                      key={barber._id}
                      className={`p-6 cursor-pointer transition-all ${
                        selectedBarber?._id === barber._id
                          ? 'border-2 border-brand-pink bg-background'
                          : 'hover:shadow-lg'
                      }`}
                      onClick={() => handleBarberSelect(barber)}
                    >
                      <div className="flex gap-4">
                        {barber.profileImage && (
                          <img
                            src={barber.profileImage}
                            alt={barber.name}
                            className="w-16 h-16 rounded-full object-cover bg-gray-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-foreground">{barber.name}</h3>
                          {barber.specializations.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {barber.specializations.slice(0, 3).map((spec) => (
                                <Badge key={spec} variant="info" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* DATE SELECTION */}
            {step === 'schedule' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Choose date and time</h2>
                <p className="text-sm text-foreground-secondary">Select a date to see live available times.</p>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    const date = e.target.value;
                    setSelectedDate(date);
                    setSelectedTime('');
                    setAvailableSlots([]);
                    setAvailabilityError('');
                    if (date) void fetchAvailableSlots(date);
                  }}
                  min={minBookingDate}
                  max={maxBookingDate}
                  className="w-full"
                />
                {loading ? (
                  <Card className="p-8 flex items-center justify-center">
                    <Spinner size="md" />
                  </Card>
                ) : availabilityError ? (
                  <Card className="p-8 text-center">
                    <p role="alert" className="text-foreground-secondary mb-4">{availabilityError}</p>
                    <Button variant="primary" onClick={() => void fetchAvailableSlots()}>Retry</Button>
                  </Card>
                ) : availableSlots.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-foreground-secondary">No available times on this date. Try another date.</p>
                  </Card>
                ) : (
                  <>
                  <h3 className="font-semibold text-foreground">Available times</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.startTime}
                        onClick={() => slot.available && handleTimeSelect(slot.startTime)}
                        disabled={!slot.available}
                        className={`p-3 rounded-lg font-medium text-sm transition-all ${
                          slot.available
                            ? selectedTime === slot.startTime
                              ? 'bg-brand-pink text-white'
                              : 'bg-background text-foreground hover:bg-gray-100'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                  </>
                )}
              </div>
            )}

            {/* REVIEW */}
            {step === 'review' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground mb-6">Review Booking</h2>
                <Card className="p-6 space-y-4">
                  <div>
                    <p className="text-sm text-foreground-secondary">Service</p>
                    <p className="font-medium text-foreground">{selectedService?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground-secondary">Barber</p>
                    <p className="font-medium text-foreground">{selectedBarber?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground-secondary">Date & Time</p>
                    <p className="font-medium text-foreground">
                      {new Date(selectedDate).toLocaleDateString()} at {selectedTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground-secondary">Price</p>
                    <p className="text-2xl font-bold text-brand-pink">
                      {formatCurrency(checkoutPrice?.totalAmount ?? selectedService?.price ?? 0)}
                    </p>
                  </div>
                </Card>

                <details className="rounded-xl border border-border p-4">
                  <summary className="cursor-pointer font-medium text-foreground">Have a coupon or want to use points?</summary>
                  <div className="mt-4 space-y-3">
                  <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Coupon code" />
                  <Input type="number" min="0" value={loyaltyPoints || ''} onChange={(e) => setLoyaltyPoints(Math.max(0, Number(e.target.value) || 0))} placeholder="Loyalty points to redeem" />
                  <Button variant="secondary" onClick={() => void previewPrice()} disabled={priceLoading} fullWidth>
                    {priceLoading ? 'Calculating...' : 'Apply and calculate price'}
                  </Button>
                  {checkoutPrice && <div className="border-t border-border pt-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(checkoutPrice.subtotal)}</span></div>
                    <div className="flex justify-between"><span>Membership</span><span>-{formatCurrency(checkoutPrice.membershipDiscount)}</span></div>
                    <div className="flex justify-between"><span>Coupon</span><span>-{formatCurrency(checkoutPrice.couponDiscount)}</span></div>
                    <div className="flex justify-between"><span>Loyalty</span><span>-{formatCurrency(checkoutPrice.loyaltyDiscount)}</span></div>
                    <div className="flex justify-between font-bold"><span>Final Amount</span><span>{formatCurrency(checkoutPrice.totalAmount)}</span></div>
                  </div>}
                  </div>
                </details>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Any special requests..."
                    className="w-full px-4 py-2 border border-border rounded-lg bg-white text-foreground"
                    rows={3}
                  />
                </div>

                <Button
                  variant="primary"
                  onClick={handleBooking}
                  disabled={bookingSubmitting || paymentPreparing}
                  fullWidth
                >
                  {bookingSubmitting ? 'Securing your slot...' : paymentPreparing ? 'Preparing secure payment...' : createdBooking ? 'Retry payment' : `Continue to payment · ${formatCurrency(checkoutPrice?.totalAmount ?? selectedService?.price ?? 0)}`}
                </Button>
                {createdBooking && <p className="text-sm text-foreground-secondary">Your booking request {createdBooking.bookingNumber} is saved. Retry will continue payment for this request.</p>}
                {bookingError && <p role="alert" className="text-sm text-red-700">{bookingError}</p>}
              </div>
            )}

            {step === 'payment' && paymentOrder && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Pay securely</h2>
                {createdBooking && <p className="text-sm text-foreground-secondary">Booking {createdBooking.bookingNumber} · {createdBooking.service.name} · {formatCurrency(createdBooking.totalAmount)}</p>}
                <Card className="p-6">
                  <RazorpayCheckout
                    orderId={paymentOrder.orderId}
                    amount={paymentOrder.amount}
                    currency={paymentOrder.currency}
                    keyId={paymentOrder.keyId}
                    bookingNumber={paymentOrder.bookingNumber}
                    customerName={customerProfile?.name || 'Customer'}
                    customerEmail={customerProfile?.email || 'customer@example.com'}
                    customerPhone={customerProfile?.phone || '9999999999'}
                    salonName={salon.name}
                    onSuccess={handlePaymentSuccess}
                    onFailure={handlePaymentFailure}
                    onCancel={() => setStep('review')}
                  />
                </Card>
              </div>
            )}
          </div>

          {/* Summary Sidebar */}
          <div>
            <Card className="p-6 sticky top-4">
              <h3 className="font-bold text-lg text-foreground mb-4">Booking Summary</h3>
              <div className="space-y-3 text-sm">
                {selectedService && (
                  <div>
                    <p className="text-foreground-secondary">Service</p>
                    <p className="font-medium text-foreground">{selectedService.name}</p>
                  </div>
                )}
                {selectedBarber && (
                  <div>
                    <p className="text-foreground-secondary">Barber</p>
                    <p className="font-medium text-foreground">{selectedBarber.name}</p>
                  </div>
                )}
                {selectedDate && (
                  <div>
                    <p className="text-foreground-secondary">Date</p>
                    <p className="font-medium text-foreground">
                      {new Date(selectedDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {selectedTime && (
                  <div>
                    <p className="text-foreground-secondary">Time</p>
                    <p className="font-medium text-foreground">{selectedTime}</p>
                  </div>
                )}
                {selectedService && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-foreground-secondary">Total</p>
                    <p className="text-2xl font-bold text-brand-pink">
                      {formatCurrency(checkoutPrice?.totalAmount ?? selectedService.price)}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
