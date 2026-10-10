'use client';

import { FormEvent, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  Smartphone,
  Sparkles,
  XCircle,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Loading';
import Logo from '@/components/navbar/Logo';
import Badge from '@/components/ui/Badge';
import { isValidIndianPhoneNumber } from '@/utils/phone';

type SignupStepType = 'phone' | 'otp';
const OTP_LENGTH = 6;

const brandHighlights = [
  { title: 'Find a Salon', description: 'Discover trusted salons and barbers near you in seconds.', icon: MapPin },
  { title: 'Book Your Slot', description: 'See real openings and reserve a time that fits your day.', icon: Clock3 },
  { title: 'No Waiting', description: 'Walk in at your booked time and get served right away.', icon: BadgeCheck },
];

export default function OtpSignupForm({ salonOwner = false }: { salonOwner?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<SignupStepType>('phone');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const nextPath = (() => {
    const value = searchParams.get('next');
    return value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
  })();

  useEffect(() => {
    if (sent) {
      const timer = setTimeout(() => otpRefs.current[0]?.focus(), 250);
      return () => clearTimeout(timer);
    }
  }, [sent]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    setOtp(next.join(''));
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((char, index) => { next[index] = char; });
    setOtpDigits(next);
    setOtp(next.join(''));
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[focusIndex]?.focus();
  };

  const resetToPhone = () => {
    setStep('phone');
    setSent(false);
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setOtp('');
    setError('');
    setSuccess('');
  };

  async function sendOtp(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('');
    if (!name.trim() || name.trim().length < 2) return setError('Enter your name');
    if (!email.trim() || !email.includes('@')) return setError('Enter a valid email address');
    if (!isValidIndianPhoneNumber(phone)) return setError('Enter a valid Indian mobile number');
    setLoading(true);
    try {
      const endpoint = salonOwner ? '/api/auth/send-salon-owner-otp' : '/api/auth/send-otp';
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send OTP');
      setDevOtp(result.devOtp || null);
      setSuccess('OTP sent successfully!');
      setSent(true);
      setStep('otp');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to send OTP'); } finally { setLoading(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('');
    if (!/^\d{6}$/.test(otp)) return setError('Enter the 6-digit OTP');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, otp }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to verify OTP');
      const role = result?.user?.role as string | undefined;
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') { router.replace('/admin'); return; }
      if (role === 'SALON_OWNER') {
        const profileResponse = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined }) });
        if (!profileResponse.ok) throw new Error('Account created but profile setup failed');
        router.replace(salonOwner ? '/salon/onboarding' : '/dashboard/salon');
        return;
      }
      if (role === 'SALON_STAFF') { router.replace('/dashboard/salon'); return; }
      if (role === 'BARBER') { router.replace('/dashboard/barber'); return; }
      if (salonOwner) throw new Error('This phone number already belongs to a customer account. Sign in with that account or use a different number.');
      if (role !== 'CUSTOMER') throw new Error('This account cannot use customer signup.');
      const profileResponse = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined }) });
      if (!profileResponse.ok) throw new Error('Account created but profile setup failed');
      router.replace(nextPath);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to complete signup'); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden bg-brand-black text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,45,122,0.35),_transparent_55%),radial-gradient(circle_at_bottom_right,_rgba(255,45,122,0.18),_transparent_50%)]" />
        <div className="relative z-10 p-12"><Logo size="lg" /></div>
        <div className="relative z-10 px-12">
          <Badge variant="pink" className="inline-flex items-center gap-2"><Sparkles size={14} />Salon booking</Badge>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight xl:text-5xl">Create a Salon.<span className="block text-brand-pink">Book Your Slot.</span><span className="block">No Waiting.</span></h1>
          <p className="mt-5 max-w-md text-lg text-white/70">Create your BookMyNai account and discover salons, barbers and real-time openings near you.</p>
          <div className="mt-10 space-y-4">
            {brandHighlights.map(({ title, description, icon: Icon }) => (
              <div key={title} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-pink/20 text-brand-pink"><Icon size={20} /></div>
                <div><p className="font-semibold">{title}</p><p className="text-sm text-white/60">{description}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-x-6 gap-y-3 p-12 text-sm text-white/70">
          <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand-pink" />Secure OTP signup</span>
          <span className="flex items-center gap-2"><BadgeCheck size={16} className="text-brand-pink" />Verified salons</span>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white via-brand-pink/5 to-white px-4 py-10 sm:px-6 lg:py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden"><Logo size="md" /></div>
          <Card className="w-full border border-border/70 p-7 shadow-bookmynai-lg sm:p-9">
            <div className="mb-7 flex items-center justify-center gap-2">
              <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 'phone' ? 'w-8 bg-brand-pink' : 'w-4 bg-brand-pink/30'}`} />
              <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 'otp' ? 'w-8 bg-brand-pink' : 'w-4 bg-brand-pink/30'}`} />
            </div>

            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-pink/10 text-brand-pink">
                {step === 'phone' ? <Smartphone size={26} /> : <ShieldCheck size={26} />}
              </div>
              <h2 className="text-2xl font-bold text-brand-black sm:text-3xl">
                {step === 'phone' ? (salonOwner ? 'Register as a Salon Owner' : 'Create your customer account') : 'Verify your number'}
              </h2>
              <p className="mt-2 text-foreground-secondary">
                {step === 'phone' ? (salonOwner ? 'Verify your number to register your salon business' : 'Create a BookMyNai customer account') : `We sent a 6-digit code to ${phone}`}
              </p>
            </div>

            {error && <div className="mb-4 flex items-start gap-2 rounded-xl border border-error-200 bg-error-50 p-3"><XCircle size={18} className="mt-0.5 shrink-0 text-error-600" /><p className="text-sm text-error-700">{error}</p></div>}
            {success && <div className="mb-4 flex items-start gap-2 rounded-xl border border-success-200 bg-success-50 p-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success-600" /><p className="text-sm text-success-700">{success}</p></div>}
            {devOtp && <div className="mb-4 flex items-center gap-2 rounded-xl border border-info-200 bg-info-50 p-3"><Badge variant="info">DEV MODE</Badge><p className="text-sm text-info-600">OTP: {devOtp}</p></div>}

            <div className="relative overflow-hidden">
              {step === 'phone' && (
                <form onSubmit={sendOtp} className="animate-in fade-in slide-in-from-right-4 space-y-5 duration-300">
                  <div className="space-y-4">
                    <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
                    <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                    <Input label="Mobile number" type="tel" placeholder="9876543210 or +919876543210" value={phone} onChange={(event) => setPhone(event.target.value)} required disabled={loading} />
                  </div>
                  <Button type="submit" variant="primary" fullWidth disabled={loading}>{loading ? <Spinner size="sm" /> : <span className="flex items-center justify-center gap-2">Send OTP <ArrowRight size={18} /></span>}</Button>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={verify} className="animate-in fade-in slide-in-from-right-4 space-y-5 duration-300">
                  <div>
                    <label className="mb-3 block text-sm font-medium text-brand-black">Enter OTP</label>
                    <div className="flex justify-between gap-2 sm:gap-3">
                      {otpDigits.map((digit, index) => (
                        <input key={index} ref={(element) => { otpRefs.current[index] = element; }} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={1} value={digit} onChange={(event) => handleOtpChange(index, event.target.value)} onKeyDown={(event) => handleOtpKeyDown(index, event)} onPaste={handleOtpPaste} disabled={loading} aria-label={`OTP digit ${index + 1}`} className="h-14 w-full rounded-xl border border-border bg-neutral-50 text-center text-xl font-bold text-brand-black outline-none transition-all focus:border-brand-pink focus:bg-white focus:ring-2 focus:ring-brand-pink/20 disabled:opacity-60" />
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-foreground-secondary">Enter the 6-digit code sent to {phone}</p>
                  </div>
                  <Button type="submit" variant="primary" fullWidth disabled={loading}>{loading ? <Spinner size="sm" /> : <span className="flex items-center justify-center gap-2">Verify OTP <CheckCircle2 size={18} /></span>}</Button>
                  <Button type="button" variant="ghost" fullWidth onClick={resetToPhone} disabled={loading}><span className="flex items-center justify-center gap-2"><ArrowLeft size={16} />Change mobile number</span></Button>
                  <div className="text-center">
                    <button type="button" onClick={sendOtp} className="text-sm font-semibold text-brand-pink transition-colors hover:text-brand-pink-hover" disabled={loading}>Resend OTP</button>
                  </div>
                </form>
              )}
            </div>

            <div className="mt-8 border-t border-border pt-6 text-center">
              <p className="text-sm text-foreground-secondary">Already have an account? <Link href="/login" className="font-semibold text-brand-pink">Sign in</Link></p>
            </div>
          </Card>
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-foreground-secondary"><ShieldCheck size={14} className="text-brand-pink" />Your details are encrypted and never shared.</p>
        </div>
      </main>
    </div>
  );
}
