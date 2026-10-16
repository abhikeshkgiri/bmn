import { Suspense } from 'react';
import OtpSignupForm from '@/components/auth/OtpSignupForm';

export default function SignupPage() {
  return <Suspense fallback={<main className="mx-auto max-w-lg p-8">Loading signup...</main>}><OtpSignupForm /></Suspense>;
}
