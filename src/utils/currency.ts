/**
 * Currency utility functions
 * Handles conversion between paise (storage) and INR (display)
 */

/**
 * Format paise to INR currency display
 * @param paise - Amount in paise (100 paise = ₹1)
 * @returns Formatted currency string (e.g., "₹300")
 */
export function formatCurrency(paise: number): string {
  if (paise === 0) return '₹0';
  if (paise < 0) return `-₹${Math.abs(paise / 100).toFixed(0)}`;
  return `₹${(paise / 100).toFixed(0)}`;
}

/**
 * Format paise to INR with decimal places
 * @param paise - Amount in paise
 * @param decimalPlaces - Number of decimal places (default 0)
 * @returns Formatted currency string
 */
export function formatCurrencyWithDecimals(paise: number, decimalPlaces: number = 0): string {
  const inr = paise / 100;
  return `₹${inr.toFixed(decimalPlaces)}`;
}

/**
 * Convert INR to paise
 * @param inr - Amount in INR
 * @returns Amount in paise (integer)
 */
export function convertToPaise(inr: number): number {
  return Math.round(inr * 100);
}

/**
 * Convert paise to INR
 * @param paise - Amount in paise
 * @returns Amount in INR
 */
export function convertToINR(paise: number): number {
  return paise / 100;
}
