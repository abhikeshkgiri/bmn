/**
 * Razorpay Client Wrapper
 * Server-side only, handles Razorpay API interactions
 * Never expose secret key to client
 */

import crypto from 'crypto';
import Razorpay from 'razorpay';

let razorpayInstance: Razorpay | null = null;

/**
 * Get or create Razorpay client instance
 * Validates required environment variables on first call
 */
export function getRazorpayClient(): Razorpay {
  // Return cached instance if already initialized
  if (razorpayInstance) {
    return razorpayInstance;
  }

  // Validate required environment variables
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.'
    );
  }

  // Create and cache Razorpay instance
  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayInstance;
}

/**
 * Get public key ID for client-side Razorpay Checkout
 * This is safe to expose to the browser
 */
export function getRazorpayPublicKeyId(): string {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  if (!keyId) {
    throw new Error(
      'Razorpay public key ID not configured. Set NEXT_PUBLIC_RAZORPAY_KEY_ID in environment variables.'
    );
  }

  return keyId;
}

/**
 * Verify Razorpay webhook signature
 * Uses HMAC SHA256 with webhook secret
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('Razorpay webhook secret not configured');
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Verify Razorpay payment signature
 * Uses HMAC SHA256 with key secret
 * Signature is computed over: order_id + "|" + payment_id
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    throw new Error('Razorpay key secret not configured');
  }

  const data = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  return expectedSignature === signature;
}
