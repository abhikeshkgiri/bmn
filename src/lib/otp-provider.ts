/**
 * OTP Provider abstraction
 * Allows switching between development and production OTP implementations
 * Production implementation supports multiple SMS providers via environment configuration
 *
 * Configuration:
 * - OTP_PROVIDER: 'development' | 'twilio' | 'mock'
 * - For development: console output (logs OTP to console)
 * - For mock/test: simulates OTP sending without actually sending
 * - For twilio: Uses Twilio SDK to send real SMS
 *
 * Environment variables required for production:
 * - Twilio: OTP_TWILIO_ACCOUNT_SID, OTP_TWILIO_AUTH_TOKEN, OTP_TWILIO_FROM_NUMBER
 */

import twilio from 'twilio';

export interface OtpProvider {
  /**
   * Send OTP to phone number
   * @param phone International format: +91XXXXXXXXXX
   * @param otp The OTP code to send
   * @returns true if sent successfully, false otherwise
   */
  send(phone: string, otp: string): Promise<boolean>;
}

/**
 * Development OTP provider
 * Logs OTP to console for testing
 * Only used when NODE_ENV !== 'production' AND OTP_PROVIDER is not configured
 */
class DevelopmentOtpProvider implements OtpProvider {
  async send(phone: string, otpCode: string): Promise<boolean> {
    console.log(`\n📱 [DEV OTP] Phone: ${phone}, OTP: ${otpCode}`);
    console.log('⚠️  This is development mode only. In production, OTP would be sent via SMS.\n');
    return true;
  }
}

/**
 * Mock/Test OTP provider
 * Simulates OTP sending without actually sending messages
 * Useful for testing and CI/CD environments
 */
class MockOtpProvider implements OtpProvider {
  async send(phone: string, otpCode: string): Promise<boolean> {
    console.log(`[MOCK OTP] Simulating OTP send to ${phone}: ${otpCode}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }
}

/**
 * Twilio OTP provider
 * Sends real SMS via Twilio
 * Requires: OTP_TWILIO_ACCOUNT_SID, OTP_TWILIO_AUTH_TOKEN, OTP_TWILIO_FROM_NUMBER
 */
class TwilioOtpProvider implements OtpProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.OTP_TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.OTP_TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.OTP_TWILIO_FROM_NUMBER || '';

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      throw new Error(
        'Twilio OTP provider is not properly configured. ' +
        'Set OTP_TWILIO_ACCOUNT_SID, OTP_TWILIO_AUTH_TOKEN, and OTP_TWILIO_FROM_NUMBER environment variables.'
      );
    }
  }

  async send(phone: string, otpCode: string): Promise<boolean> {
    try {
      const client = twilio(this.accountSid, this.authToken);
      await client.messages.create({
        body: `Your BookMyNai verification code is ${otpCode}. It expires soon.`,
        from: this.fromNumber,
        to: phone,
      });
      return true;
    } catch (error) {
      console.error('Failed to send OTP via Twilio:', error);
      return false;
    }
  }
}

/**
 * Get the appropriate OTP provider based on environment configuration
 * Priority:
 * 1. If OTP_PROVIDER is explicitly set, use that
 * 2. If NODE_ENV === 'production', require explicit configuration
 * 3. Otherwise use development provider
 */
function getOtpProvider(): OtpProvider {
  const provider = process.env.OTP_PROVIDER?.toLowerCase() || '';
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Explicit provider configuration
  if (nodeEnv === 'production' && provider !== 'twilio') {
    throw new Error('OTP_PROVIDER_NOT_CONFIGURED: production requires OTP_PROVIDER=twilio');
  }

  if (provider === 'twilio') {
    return new TwilioOtpProvider();
  } else if (provider === 'mock' && nodeEnv !== 'production') {
    return new MockOtpProvider();
  } else if (provider === 'development' && nodeEnv !== 'production') {
    return new DevelopmentOtpProvider();
  }

  // Default behavior based on environment
  if (nodeEnv === 'production') {
    throw new Error('OTP_PROVIDER_NOT_CONFIGURED: production requires OTP_PROVIDER=twilio');
  }

  if (process.env.AUTH_DEV_MODE === 'true') {
    return new DevelopmentOtpProvider();
  }

  return new MockOtpProvider();
}

// Singleton instance
let provider: OtpProvider | null = null;

export function getProvider(): OtpProvider {
  if (!provider) {
    provider = getOtpProvider();
  }
  return provider;
}

/**
 * Send OTP through the configured provider
 */
export async function sendOtp(phone: string, otp: string): Promise<boolean> {
  const provider = getProvider();
  return provider.send(phone, otp);
}
