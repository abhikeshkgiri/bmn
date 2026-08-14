'use client';

import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: { code?: string; description?: string };
  reason?: { order_id?: string };
  order_id?: string;
  code?: string;
  description?: string;
};

interface RazorpayCheckoutProps {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  salonName: string;
  onSuccess: (paymentData: RazorpaySuccessResponse) => Promise<void>;
  onFailure: (error: RazorpayFailureResponse) => Promise<void>;
  onCancel: () => void;
}

/**
 * Razorpay Checkout Component
 * Handles secure payment processing via Razorpay
 * Must be used with NEXT_PUBLIC_RAZORPAY_KEY_ID
 */
export function RazorpayCheckout({
  orderId,
  amount,
  currency,
  keyId,
  bookingNumber,
  customerName,
  customerEmail,
  customerPhone,
  salonName,
  onSuccess,
  onFailure,
  onCancel,
}: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scriptLoaded = useRef(false);

  // Load Razorpay script
  useEffect(() => {
    if (scriptLoaded.current) return;

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      scriptLoaded.current = true;
    };
    script.onerror = () => {
      setError('Failed to load payment gateway. Please refresh and try again.');
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handlePayment = async () => {
    if (!window.Razorpay) {
      setError('Payment gateway not loaded. Please refresh and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const options = {
        key: keyId,
        order_id: orderId,
        amount: amount,
        currency: currency,
        name: salonName,
        description: `Booking: ${bookingNumber}`,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: '#ec4899', // pink color from brand palette
        },
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            await onSuccess(response);
          } catch (err) {
            console.error('Payment success callback error:', err);
            setError('Payment confirmed but failed to update booking. Please contact support.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            onCancel();
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on('payment.failed', async (response: RazorpayFailureResponse) => {
        try {
          await onFailure(response);
        } catch (err) {
          console.error('Payment failure callback error:', err);
        } finally {
          setLoading(false);
        }
      });

      razorpay.open();
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to initiate payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-foreground-secondary">Amount</span>
          <span className="font-medium text-foreground">
            ₹{(amount / 100).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground-secondary">Order ID</span>
          <span className="text-xs font-mono text-foreground">{orderId}</span>
        </div>
      </div>

      <Button
        onClick={handlePayment}
        disabled={loading}
        fullWidth
        variant="primary"
      >
        {loading ? (
          <>
            <span className="mr-2"><Spinner size="sm" /></span>
            Processing...
          </>
        ) : (
          'Pay Now'
        )}
      </Button>

      <p className="text-xs text-foreground-secondary text-center">
        You will be redirected to Razorpay for secure payment.
      </p>
    </div>
  );
}

// Extend Window interface to include Razorpay
declare global {
  interface Window {
    Razorpay: {
      new (options: Record<string, unknown>): {
        on: (event: string, callback: (response: RazorpayFailureResponse) => void) => void;
        open: () => void;
      };
    };
  }
}
