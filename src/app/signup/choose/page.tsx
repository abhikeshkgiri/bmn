import Link from 'next/link';
import Logo from '@/components/navbar/Logo';
import RoleSelection from '@/components/auth/RoleSelection';

export default function SignupChoicePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-brand-pink/5 to-white px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex justify-center"><Logo size="md" /></div>
        <RoleSelection mode="signup" />
        <p className="mt-6 text-center text-sm text-foreground-secondary">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-pink">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
