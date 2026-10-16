import { Suspense } from 'react';
import OtpSignupForm from '@/components/auth/OtpSignupForm';

export default function SalonSignupPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-lg p-8">Loading salon owner signup...</main>}>
      <OtpSignupForm salonOwner />
    </Suspense>
  );
}
