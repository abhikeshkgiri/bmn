/**
 * Razorpay Client Wrapper
 * Server-side only, handles Razorpay API interactions
 * Never expose secret key to client
 */

import crypto from 'crypto';
import Razorpay from 'razorpay';
import { requireEnvironmentVariable } from '@/lib/env';

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
  const keyId = requireEnvironmentVariable('RAZORPAY_KEY_ID');
  const keySecret = requireEnvironmentVariable('RAZORPAY_KEY_SECRET');

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
  return requireEnvironmentVariable('NEXT_PUBLIC_RAZORPAY_KEY_ID');
}

/**
 * Verify Razorpay webhook signature
 * Uses HMAC SHA256 with webhook secret
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const secret = requireEnvironmentVariable('RAZORPAY_WEBHOOK_SECRET');

  return verifyHmacSignature(body, signature, secret);
}

export function verifyWebhookSignatureWithSecret(
  body: string,
  signature: string,
  secret: string,
): boolean {
  return verifyHmacSignature(body, signature, secret);
}

function verifyHmacSignature(data: string, signature: string, secret: string): boolean {
  if (!/^[a-f\d]{64}$/i.test(signature)) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex'),
  );
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
  const secret = requireEnvironmentVariable('RAZORPAY_KEY_SECRET');

  return verifyPaymentSignatureWithSecret(orderId, paymentId, signature, secret);
}

export function verifyPaymentSignatureWithSecret(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  return verifyHmacSignature(`${orderId}|${paymentId}`, signature, secret);
}
