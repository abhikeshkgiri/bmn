/**
 * Phone number normalization utility
 * Ensures consistent international format for Indian mobile numbers
 */

/**
 * Normalize Indian mobile number to international format: +91XXXXXXXXXX
 * Accepts: 9876543210, +919876543210, 919876543210
 * Returns: +919876543210
 */
export function normalizePhoneNumber(input: string): string {
  // Remove all whitespace and non-digit characters except +
  let cleaned = input.replace(/[\s\-().]/g, '');

  // Handle + prefix
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // If starts with 91, it's already in country code format
  if (cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  }

  // If starts with 0, it's national format
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // Should now have 10 digits
  if (cleaned.length !== 10) {
    throw new Error('Phone number must have 10 digits');
  }

  // Validate it's all digits
  if (!/^\d{10}$/.test(cleaned)) {
    throw new Error('Phone number must contain only digits');
  }

  // Return in international format: +91XXXXXXXXXX
  return `+91${cleaned}`;
}

/**
 * Validate if a phone number is a valid Indian mobile format
 * After normalization
 */
export function isValidIndianPhoneNumber(phone: string): boolean {
  try {
    const normalized = normalizePhoneNumber(phone);
    // Check if it matches +91 followed by 10 digits
    return /^\+91\d{10}$/.test(normalized);
  } catch {
    return false;
  }
}

/**
 * Extract just the 10-digit part from a phone number
 */
export function getPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}
