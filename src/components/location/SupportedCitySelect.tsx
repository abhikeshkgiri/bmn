'use client';

import { SUPPORTED_LAUNCH_CITIES } from '@/constants/launch-cities';
import { normalizeSupportedSalonLocation } from '@/constants/launch-cities';

interface SupportedCitySelectProps {
  value: string;
  state?: string;
  onChange: (location: { city: string; state: string }) => void;
  id?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function SupportedCitySelect({
  value,
  state,
  onChange,
  id,
  label = 'City',
  required = false,
  disabled = false,
}: SupportedCitySelectProps) {
  const selected = state
    ? normalizeSupportedSalonLocation(value, state)
    : SUPPORTED_LAUNCH_CITIES.find((location) => location.city === value);

  return (
    <label htmlFor={id} className="block text-sm font-medium">
      {label}
      <select
        id={id}
        aria-label={label}
        value={selected?.city || ''}
        required={required}
        disabled={disabled}
        onChange={(event) => {
          const location = SUPPORTED_LAUNCH_CITIES.find((item) => item.city === event.target.value);
          if (location) onChange(location);
        }}
        className="mt-1 w-full rounded-lg border border-border bg-white p-3 text-foreground"
      >
        <option value="" disabled>Select a supported city</option>
        {SUPPORTED_LAUNCH_CITIES.map(({ city, state }) => (
          <option key={city} value={city}>{city}, {state}</option>
        ))}
      </select>
    </label>
  );
}
