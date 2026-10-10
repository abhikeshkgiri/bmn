export const SUPPORTED_LAUNCH_CITIES = [
  { city: 'Delhi', state: 'Delhi' },
  { city: 'Bengaluru', state: 'Karnataka' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Gurugram', state: 'Haryana' },
  { city: 'Kolkata', state: 'West Bengal' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Noida', state: 'Uttar Pradesh' },
  { city: 'Lucknow', state: 'Uttar Pradesh' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Ghaziabad', state: 'Uttar Pradesh' },
  { city: 'Faridabad', state: 'Haryana' },
  { city: 'Chandigarh', state: 'Chandigarh' },
] as const;

export type SupportedLaunchCity = (typeof SUPPORTED_LAUNCH_CITIES)[number];

const normalizeLocationPart = (value: string) => value.trim().toLocaleLowerCase('en-IN');

export function getSupportedLaunchCity(city: string): SupportedLaunchCity | undefined {
  const normalizedCity = normalizeLocationPart(city);
  return SUPPORTED_LAUNCH_CITIES.find(
    (supported) => normalizeLocationPart(supported.city) === normalizedCity
  );
}

export function normalizeSupportedSalonLocation(
  city: string,
  state: string
): SupportedLaunchCity | undefined {
  const normalizedCity = normalizeLocationPart(city);
  const normalizedState = normalizeLocationPart(state);
  return SUPPORTED_LAUNCH_CITIES.find(
    (supported) =>
      normalizeLocationPart(supported.city) === normalizedCity &&
      normalizeLocationPart(supported.state) === normalizedState
  );
}

export function isSupportedSalonLocation(city: string, state: string): boolean {
  return Boolean(normalizeSupportedSalonLocation(city, state));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactTrimmedRegex(value: string): RegExp {
  return new RegExp(`^\\s*${escapeRegex(value)}\\s*$`, 'i');
}

export function getSupportedSalonLocationFilter(
  city?: string,
  state?: string
): { $or: Array<{ 'address.city': RegExp; 'address.state': RegExp }> } | null {
  let locations: readonly SupportedLaunchCity[] = SUPPORTED_LAUNCH_CITIES;

  if (city?.trim()) {
    const supportedCity = getSupportedLaunchCity(city);
    if (!supportedCity) return null;
    locations = [supportedCity];
  }

  if (state?.trim()) {
    const normalizedState = normalizeLocationPart(state);
    locations = locations.filter(
      (location) => normalizeLocationPart(location.state) === normalizedState
    );
  }

  if (locations.length === 0) return null;
  return {
    $or: locations.map((location) => ({
      'address.city': exactTrimmedRegex(location.city),
      'address.state': exactTrimmedRegex(location.state),
    })),
  };
}

export const UNSUPPORTED_CITY_MESSAGE =
  "BookMyNai isn't available in this area yet. We're expanding city by city. Choose a supported city to list your salon, or check back soon as we expand.";
