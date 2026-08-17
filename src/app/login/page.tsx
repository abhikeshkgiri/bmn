'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

type LoginStepType = 'phone' | 'otp';

const OTP_LENGTH = 6;

const brandHighlights = [
  {
    title: 'Find a Salon',
    description: 'Discover trusted salons and barbers near you in seconds.',
    icon: MapPin,
  },
  {
    title: 'Book Your Slot',
    description: 'See real openings and reserve a time that fits your day.',
    icon: Clock3,
  },
  {
    title: 'No Waiting',
    description: 'Walk in at your booked time and get served right away.',
    icon: BadgeCheck,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStepType>('phone');
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otp = otpDigits.join('');

  // Focus the first OTP box when we move to the OTP step
  useEffect(() => {
    if (step === 'otp') {
      const timer = setTimeout(() => otpRefs.current[0]?.focus(), 250);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle sending OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    if (!isValidIndianPhoneNumber(phone)) {
      setError('Please enter a valid Indian mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send OTP');
        setLoading(false);
        return;
      }

      setSuccess('OTP sent successfully!');
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
      setStep('otp');
      startResendCooldown();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle verifying OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp.trim() || otp.length !== OTP_LENGTH) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to verify OTP');
        setLoading(false);
        return;
      }

      setSuccess('Logged in successfully!');
      // Redirect to home or dashboard
      setTimeout(() => router.push('/'), 1500);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // OTP box handlers
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((char, i) => {
      next[i] = char;
    });
    setOtpDigits(next);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[focusIndex]?.focus();
  };

  const resetToPhone = () => {
    setStep('phone');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* --------------------------- Left brand panel --------------------------- */}
      <aside className="relative hidden overflow-hidden bg-brand-black text-white lg:flex lg:flex-col lg:justify-between">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,45,122,0.35),_transparent_55%),radial-gradient(circle_at_bottom_right,_rgba(255,45,122,0.18),_transparent_50%)]" />

        <div className="relative z-10 p-12">
          <Logo size="lg" />
        </div>

        <div className="relative z-10 px-12">
          <Badge variant="pink" className="inline-flex items-center gap-2">
            <Sparkles size={14} />
            Salon booking
          </Badge>

          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight xl:text-5xl">
            Find a Salon.
            <span className="block text-brand-pink">Book Your Slot.</span>
            <span className="block">No Waiting.</span>
          </h1>

          <p className="mt-5 max-w-md text-lg text-white/70">
            Sign in to check real-time availability and reserve your spot before you leave home.
          </p>

          <div className="mt-10 space-y-4">
            {brandHighlights.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-pink/20 text-brand-pink">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-white/60">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-x-6 gap-y-3 p-12 text-sm text-white/70">
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand-pink" />
            Secure OTP login
          </span>
          <span className="flex items-center gap-2">
            <BadgeCheck size={16} className="text-brand-pink" />
            Verified salons
          </span>
        </div>
      </aside>

      {/* ----------------------------- Right / form ----------------------------- */}
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white via-brand-pink/5 to-white px-4 py-10 sm:px-6 lg:py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo size="md" />
          </div>

          <Card className="w-full border border-border/70 p-7 shadow-bookmynai-lg sm:p-9">
            {/* Step indicator */}
            <div className="mb-7 flex items-center justify-center gap-2">
              <span
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === 'phone' ? 'w-8 bg-brand-pink' : 'w-4 bg-brand-pink/30'
                }`}
              />
              <span
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === 'otp' ? 'w-8 bg-brand-pink' : 'w-4 bg-brand-pink/30'
                }`}
              />
            </div>

            {/* Title */}
            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-pink/10 text-brand-pink">
                {step === 'phone' ? <Smartphone size={26} /> : <ShieldCheck size={26} />}
              </div>
              <h2 className="text-2xl font-bold text-brand-black sm:text-3xl">
                {step === 'phone' ? 'Welcome back' : 'Verify your number'}
              </h2>
              <p className="mt-2 text-foreground-secondary">
                {step === 'phone'
                  ? 'Sign in to your BookMyNai account'
                  : `We sent a 6-digit code to ${phone}`}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-error-200 bg-error-50 p-3">
                <XCircle size={18} className="mt-0.5 shrink-0 text-error-600" />
                <p className="text-sm text-error-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-success-200 bg-success-50 p-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success-600" />
                <p className="text-sm text-success-700">{success}</p>
              </div>
            )}

            {/* Dev OTP Badge */}
            {devOtp && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-info-200 bg-info-50 p-3">
                <Badge variant="info">DEV MODE</Badge>
                <p className="text-sm text-info-600">OTP: {devOtp}</p>
              </div>
            )}

            {/* Animated step wrapper */}
            <div className="relative overflow-hidden">
              {/* Phone Step */}
              {step === 'phone' && (
                <form
                  onSubmit={handleSendOtp}
                  className="animate-in fade-in slide-in-from-right-4 space-y-5 duration-300"
                >
                  <div>
                    <Input
                      type="tel"
                      label="Mobile Number"
                      placeholder="9876543210 or +919876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <p className="mt-2 text-xs text-foreground-secondary">
                      Enter your Indian mobile number to receive an OTP
                    </p>
                  </div>

                  <Button type="submit" variant="primary" fullWidth disabled={loading}>
                    {loading ? (
                      <Spinner size="sm" />
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Send OTP
                        <ArrowRight size={18} />
                      </span>
                    )}
                  </Button>
                </form>
              )}

              {/* OTP Step */}
              {step === 'otp' && (
                <form
                  onSubmit={handleVerifyOtp}
                  className="animate-in fade-in slide-in-from-right-4 space-y-5 duration-300"
                >
                  <div>
                    <label className="mb-3 block text-sm font-medium text-brand-black">
                      Enter OTP
                    </label>
                    <div className="flex justify-between gap-2 sm:gap-3">
                      {otpDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            otpRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          onPaste={handleOtpPaste}
                          disabled={loading}
                          aria-label={`OTP digit ${index + 1}`}
                          className="h-14 w-full rounded-xl border border-border bg-neutral-50 text-center text-xl font-bold text-brand-black outline-none transition-all focus:border-brand-pink focus:bg-white focus:ring-2 focus:ring-brand-pink/20 disabled:opacity-60"
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-foreground-secondary">
                      Enter the 6-digit code sent to {phone}
                    </p>
                  </div>

                  <Button type="submit" variant="primary" fullWidth disabled={loading}>
                    {loading ? (
                      <Spinner size="sm" />
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Verify OTP
                        <CheckCircle2 size={18} />
                      </span>
                    )}
                  </Button>

                  {/* Change Number Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    fullWidth
                    onClick={resetToPhone}
                    disabled={loading}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <ArrowLeft size={16} />
                      Change mobile number
                    </span>
                  </Button>

                  {/* Resend OTP */}
                  <div className="text-center">
                    {resendCooldown > 0 ? (
                      <p className="text-sm text-foreground-secondary">
                        Resend OTP in{' '}
                        <span className="font-semibold text-brand-black">{resendCooldown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-sm font-semibold text-brand-pink transition-colors hover:text-brand-pink-hover"
                        disabled={loading}
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 border-t border-border pt-6 text-center">
              <p className="text-sm text-foreground-secondary">
                New to BookMyNai? Create an account after login
              </p>
            </div>
          </Card>

          {/* Trust line under card */}
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-foreground-secondary">
            <ShieldCheck size={14} className="text-brand-pink" />
            Your details are encrypted and never shared.
          </p>
        </div>
      </main>
    </div>
  );
}
