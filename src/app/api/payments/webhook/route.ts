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
import crypto from 'crypto';

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

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Webhook payload must be valid JSON',
          },
        },
        { status: 400 }
      );
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PAYLOAD', message: 'Webhook payload is invalid' } },
        { status: 400 },
      );
    }

    const webhookPayload = payload as Record<string, unknown>;
    const event = webhookPayload.event;
    const data = webhookPayload.payload;
    const eventId = request.headers.get('x-razorpay-event-id') ||
      crypto.createHash('sha256').update(body).digest('hex');

    if (
      typeof event !== 'string' ||
      !event ||
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data) ||
      eventId.length > 255
    ) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PAYLOAD', message: 'Webhook payload is incomplete' } },
        { status: 400 },
      );
    }

    // Handle webhook event
    // Supported events: payment.captured, payment.failed, refund.created, refund.processed
    const result = await handleWebhookEvent(event, data as Record<string, unknown>, eventId);
    if (result === 'BUSY') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'WEBHOOK_IN_PROGRESS',
            message: 'Webhook event is still being processed; retry later',
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Webhook processed successfully',
      },
      { status: 200 },
    );
  } catch {
    console.error('Webhook processing failed.');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: 'Error processing webhook',
        },
      },
      { status: 500 }
    );
  }
}
