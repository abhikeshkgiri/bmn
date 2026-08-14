/**
 * POST /api/payments/webhook
 * Razorpay webhook receiver
 * Handles payment events for reconciliation
 * Does NOT use normal session authentication
 * Verifies webhook signature using RAZORPAY_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { handleWebhookEvent } from '@/services/payment.service';

export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_SIGNATURE',
            message: 'Webhook signature missing',
          },
        },
        { status: 401 }
      );
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.warn('Invalid webhook signature received');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Webhook signature verification failed',
          },
        },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    const event = payload.event;
    const data = payload.payload;

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Webhook payload missing event',
          },
        },
        { status: 400 }
      );
    }

    // Handle webhook event
    // Supported events: payment.captured, payment.failed, refund.created, refund.processed
    await handleWebhookEvent(event, data || {});

    return NextResponse.json(
      {
        success: true,
        message: 'Webhook processed successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 to prevent Razorpay from retrying
    // but log the error for manual investigation
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: 'Error processing webhook',
        },
      },
      { status: 200 } // Return 200 to stop retries
    );
  }
}
