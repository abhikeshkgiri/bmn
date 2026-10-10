'use client';

import SupportedCitySelect from '@/components/location/SupportedCitySelect';

interface ComingSoonLocationProps {
  city: string;
  onChooseCity: (city: string, state: string) => void;
}

export default function ComingSoonLocation({ city, onChooseCity }: ComingSoonLocationProps) {
  return (
    <section className="rounded-2xl border border-brand-pink/20 bg-gradient-to-br from-brand-pink/5 to-white p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-pink">
        Location availability
      </p>
      <h2 className="mt-2 text-2xl font-bold text-brand-black">
        We&apos;re coming soon to {city || 'this city'}.
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-foreground-secondary">
        BookMyNai is currently available in selected cities. Explore salons in a supported location instead.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full max-w-sm">
          <SupportedCitySelect value="" onChange={({ city: nextCity, state }) => onChooseCity(nextCity, state)} />
        </div>
      </div>
    </section>
  );
}
