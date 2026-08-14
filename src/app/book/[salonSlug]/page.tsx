'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface Salon {
  _id: string;
  name: string;
  slug: string;
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

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

type BookingStep = 'service' | 'barber' | 'date' | 'time' | 'review' | 'payment';

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
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Data lists
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
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
    try {
      const response = await fetch(`/api/services?salonId=${salonId}&isActive=true`);
      const result = await response.json() as {success: boolean; data?: Service[]};
      if (result.success) {
        setServices(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  }, []);

  const fetchBarbers = useCallback(async (salonId: string) => {
    try {
      const response = await fetch(`/api/barbers?salonId=${salonId}&isActive=true`);
      const result = await response.json() as {success: boolean; data?: Barber[]};
      if (result.success) {
        setBarbers(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch barbers:', error);
    }
  }, []);

  // Fetch salon on mount
  useEffect(() => {
    const fetchSalon = async () => {
      try {
        const response = await fetch(`/api/salons?search=${salonSlug}`);
        const result = await response.json() as {success: boolean; data?: Salon[]};
        if (result.success && result.data?.length) {
          const foundSalon = result.data.find((s: Salon) => s.slug === salonSlug);
          if (foundSalon) {
            setSalon(foundSalon);
            await fetchServices(foundSalon._id);
            await fetchBarbers(foundSalon._id);
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
  }, [salonSlug, fetchServices, fetchBarbers]);

  const fetchAvailableSlots = async () => {
    if (!salon || !selectedBarber || !selectedService || !selectedDate) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/bookings/availability?salonId=${salon._id}&barberId=${selectedBarber._id}&serviceId=${selectedService._id}&date=${selectedDate}`
      );
      const result = await response.json();
      if (result.success) {
        setAvailableSlots(result.data.slots || []);
      }
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep('barber');
  };

  const handleBarberSelect = (barber: Barber) => {
    setSelectedBarber(barber);
    setStep('date');
  };

  const handleDateSelect = () => {
    if (selectedDate) {
      fetchAvailableSlots();
      setStep('time');
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('review');
  };

  const handleBooking = async () => {
    if (!salon || !selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      alert('Please complete all steps');
      return;
    }

    try {
      setBookingSubmitting(true);
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
        }),
      });

      const result = await response.json();

      if (result.success) {
        const bookingId = result.data?._id;
        const bookingNumber = result.data?.bookingNumber || 'BOOKING';

        const orderResponse = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId }),
        });

        const orderResult = await orderResponse.json();

        if (orderResult.success) {
          setPaymentBookingId(bookingId);
          setPaymentOrder({
            orderId: orderResult.data.orderId,
            amount: orderResult.data.amount,
            currency: orderResult.data.currency,
            keyId: orderResult.data.keyId,
            bookingNumber,
          });
          setStep('payment');
          return;
        }

        alert('Payment setup failed: ' + (orderResult.error?.message || 'Unknown error'));
        return;
      }

      alert('Error: ' + result.error?.message);
    } catch {
      alert('Failed to create booking');
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
  const steps: BookingStep[] = ['service', 'barber', 'date', 'time', 'review', 'payment'];
  const stepLabels: Record<BookingStep, string> = {
    service: 'Service',
    barber: 'Barber',
    date: 'Date',
    time: 'Time',
    review: 'Review',
    payment: 'Payment',
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Book Appointment</h1>
          <p className="text-foreground-secondary">{salon.name}</p>
        </div>

        {/* Stepper */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-2 flex-wrap">
            {steps.map((s, index) => (
              <div key={s} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const stepIndex = steps.indexOf(step);
                    if (index < stepIndex) {
                      setStep(s);
                    }
                  }}
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
                {services.length === 0 ? (
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
                <h2 className="text-2xl font-bold text-foreground mb-6">Select Barber</h2>
                {barbers.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-foreground-secondary">No barbers available</p>
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
            {step === 'date' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground mb-6">Select Date</h2>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
                <Button
                  variant="primary"
                  onClick={handleDateSelect}
                  disabled={!selectedDate}
                  fullWidth
                >
                  View Available Times
                </Button>
              </div>
            )}

            {/* TIME SELECTION */}
            {step === 'time' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground mb-6">Select Time Slot</h2>
                {loading ? (
                  <Card className="p-8 flex items-center justify-center">
                    <Spinner size="md" />
                  </Card>
                ) : availableSlots.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-foreground-secondary">No available slots for this date</p>
                  </Card>
                ) : (
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
                      {formatCurrency(selectedService?.price || 0)}
                    </p>
                  </div>
                </Card>

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
                  disabled={bookingSubmitting}
                  fullWidth
                >
                  {bookingSubmitting ? 'Creating Booking...' : 'Continue to Payment'}
                </Button>
              </div>
            )}

            {step === 'payment' && paymentOrder && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground mb-6">Secure Payment</h2>
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
                      {formatCurrency(selectedService.price)}
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
