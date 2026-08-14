/**
 * Slug generation utility
 * Converts names into URL-safe slugs
 * Ensures uniqueness by appending counters when needed
 */

import Salon from '@/models/Salon';

/**
 * Convert a name to a slug
 * Example: "Royal Hair Studio" → "royal-hair-studio"
 */
export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug, appending a counter if needed
 * Example:
 *   "royal-hair-studio" (if unique)
 *   "royal-hair-studio-2" (if "royal-hair-studio" exists)
 *   "royal-hair-studio-3" (if both above exist)
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = createSlug(name);

  // Check if base slug is available
  const existing = await Salon.findOne({ slug: baseSlug });
  if (!existing) {
    return baseSlug;
  }

  // If base slug exists, try appending numbers
  for (let i = 2; i <= 100; i++) {
    const candidate = `${baseSlug}-${i}`;
    const found = await Salon.findOne({ slug: candidate });
    if (!found) {
      return candidate;
    }
  }

  // Fallback: use timestamp (very rare)
  return `${baseSlug}-${Date.now()}`;
}

/**
 * Validate a slug format
 * Slugs must be lowercase alphanumeric with hyphens
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && !slug.startsWith('-') && !slug.endsWith('-');
}
