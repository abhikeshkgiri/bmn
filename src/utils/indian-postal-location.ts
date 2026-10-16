import { SUPPORTED_LAUNCH_CITIES } from '@/constants/launch-cities';

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('en-IN').replace(/[^a-z0-9]+/g, ' ');
}

const districtAliases: Record<string, string[]> = {
  Delhi: ['delhi', 'new delhi', 'central delhi', 'east delhi', 'west delhi', 'north delhi', 'south delhi', 'north east delhi', 'north west delhi', 'south east delhi', 'south west delhi', 'shahdara'],
  Bengaluru: ['bengaluru', 'bengaluru urban', 'bangalore', 'bangalore urban', 'bengaluru rural'],
  Hyderabad: ['hyderabad', 'rangareddy', 'ranga reddy', 'medchal malkajgiri', 'medchal'],
  Pune: ['pune'],
  Mumbai: ['mumbai', 'mumbai city', 'mumbai suburban'],
  Chennai: ['chennai'],
  Gurugram: ['gurugram', 'gurgaon'],
  Kolkata: ['kolkata'],
  Ahmedabad: ['ahmedabad'],
  Noida: ['gautam buddha nagar', 'gautam buddh nagar', 'noida'],
  Lucknow: ['lucknow'],
  Jaipur: ['jaipur'],
  Ghaziabad: ['ghaziabad'],
  Faridabad: ['faridabad'],
  Chandigarh: ['chandigarh'],
};

export function resolveSupportedCityFromPostalLocation(
  district: string,
  state: string,
): (typeof SUPPORTED_LAUNCH_CITIES)[number] | undefined {
  const normalizedDistrict = normalize(district);
  const normalizedState = normalize(state);

  return SUPPORTED_LAUNCH_CITIES.find((location) => {
    if (normalize(location.state) !== normalizedState) return false;
    return (districtAliases[location.city] || []).some(
      (alias) => normalize(alias) === normalizedDistrict,
    );
  });
}

export function resolveSupportedStateFromPostalLocation(state: string): string {
  const normalizedState = normalize(state);
  return SUPPORTED_LAUNCH_CITIES.find(
    (location) => normalize(location.state) === normalizedState,
  )?.state || state.trim();
}
