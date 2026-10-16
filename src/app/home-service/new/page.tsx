import { Suspense } from 'react';
import HomeServiceBookingForm from './HomeServiceBookingForm';

export default function NewHomeServicePage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-xl p-4 md:p-8">Loading booking form...</main>}>
      <HomeServiceBookingForm />
    </Suspense>
  );
}
