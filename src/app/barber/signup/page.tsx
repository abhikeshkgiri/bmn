import { Suspense } from 'react';
import OtpSignupForm from '@/components/auth/OtpSignupForm';

export default function BarberSignupPage() {
  return <Suspense fallback={<main className="mx-auto max-w-lg p-8">Loading barber signup...</main>}><OtpSignupForm barber /></Suspense>;
}
