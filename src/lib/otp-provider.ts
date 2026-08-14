/**
 * OTP Provider abstraction
 * Allows switching between development and production OTP implementations
 * Production implementation should integrate with SMS/WhatsApp providers like Twilio, AWS SNS, Gupshup, etc.
 */

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
 * Only used when NODE_ENV !== 'production'
 */
class DevelopmentOtpProvider implements OtpProvider {
  async send(phone: string, otpCode: string): Promise<boolean> {
    console.log(`\n📱 [DEV OTP] Phone: ${phone}, OTP: ${otpCode}`);
    console.log('⚠️  This is development mode only. In production, OTP would be sent via SMS/WhatsApp.\n');
    return true;
  }
}

/**
 * Production OTP provider placeholder
 * Will be implemented with real SMS provider
 */
class ProductionOtpProvider implements OtpProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async send(phone: string, otp: string): Promise<boolean> {
    // This should be implemented with a real SMS provider
    // For now, throw a clear error indicating the provider is not configured
    console.error(
      `\n❌ OTP Provider not configured for production.\n` +
        `Please configure a real OTP provider (Twilio, AWS SNS, Gupshup, etc.) before deploying.\n` +
        `Attempted to send OTP to: ${phone}\n`
    );

    // In production, we should fail loudly rather than silently pretend to send
    throw new Error('OTP_PROVIDER_NOT_CONFIGURED: Please implement a production OTP provider');
  }
}

/**
 * Get the appropriate OTP provider based on environment
 */
function getOtpProvider(): OtpProvider {
  if (process.env.NODE_ENV === 'production') {
    // In production, use real provider (must be implemented)
    // For now, returns the placeholder that throws an error if called
    return new ProductionOtpProvider();
  } else {
    // In development, use console logging
    return new DevelopmentOtpProvider();
  }
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
