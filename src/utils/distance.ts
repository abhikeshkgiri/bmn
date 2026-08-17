/**
 * Distance formatting utility
 * Formats meters to human-readable distance
 */

export function formatDistance(distanceInMeters: number): string {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} m`;
  }

  const distanceInKm = distanceInMeters / 1000;
  if (distanceInKm < 100) {
    return `${distanceInKm.toFixed(1)} km`;
  }

  return `${Math.round(distanceInKm)} km`;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 * Only used client-side as a fallback; server-side calculation is preferred
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Validate latitude range
 */
export function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

/**
 * Validate longitude range
 */
export function isValidLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng);
}

/**
 * Parse coordinates from string format
 * Supports: "28.7, 77.1" or "28.7,77.1"
 */
export function parseCoordinates(coordString: string): { lat: number; lng: number } | null {
  const parts = coordString.split(',').map((s) => parseFloat(s.trim()));

  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    return null;
  }

  const [lat, lng] = parts;

  if (!isValidCoordinates(lat, lng)) {
    return null;
  }

  return { lat, lng };
}
