/**
 * Rate limiting utility
 * In-memory implementation for development
 * Production should use Redis or similar distributed store
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();

  /**
   * Check if a key has exceeded the rate limit
   * @param key Unique identifier (e.g., phone number, IP address)
   * @param limit Maximum allowed requests
   * @param windowMs Time window in milliseconds
   * @returns true if within limit, false if exceeded
   */
  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.records.get(key);

    // If no record exists or window has expired, create new record
    if (!record || now > record.resetAt) {
      this.records.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return true;
    }

    // Increment count and check if exceeded limit
    record.count++;
    if (record.count > limit) {
      return false;
    }

    return true;
  }

  /**
   * Get remaining attempts for a key
   */
  getRemaining(key: string, limit: number): number {
    const now = Date.now();
    const record = this.records.get(key);

    if (!record || now > record.resetAt) {
      return limit;
    }

    return Math.max(0, limit - record.count);
  }

  /**
   * Get time until reset in milliseconds
   */
  getResetTime(key: string): number {
    const record = this.records.get(key);
    if (!record) return 0;

    const now = Date.now();
    const remaining = record.resetAt - now;
    return Math.max(0, remaining);
  }

  /**
   * Reset a specific key
   */
  reset(key: string): void {
    this.records.delete(key);
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.records.clear();
  }

  /**
   * Clean up expired records periodically
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now > record.resetAt) {
        this.records.delete(key);
      }
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Optional: Run cleanup every 5 minutes in development
if (process.env.NODE_ENV !== 'production') {
  setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);
}
