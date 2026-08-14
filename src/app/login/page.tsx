'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Loading';
import Logo from '@/components/navbar/Logo';
import Badge from '@/components/ui/Badge';
import { isValidIndianPhoneNumber } from '@/utils/phone';

interface LoginStep {
  type: 'phone' | 'otp';
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep['type']>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

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

      // Start resend cooldown
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

    if (!otp.trim() || otp.length !== 6) {
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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Logo size="md" />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back</h1>
            <p className="text-foreground-secondary">Sign in to your BookMyNai account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-success-50 border border-success-200 rounded-lg">
              <p className="text-sm text-success-700">{success}</p>
            </div>
          )}

          {/* Dev OTP Badge */}
          {devOtp && (
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="info">DEV MODE</Badge>
              <p className="text-sm text-info-600">OTP: {devOtp}</p>
            </div>
          )}

          {/* Phone Step */}
          {step === 'phone' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
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
                <p className="text-xs text-foreground-secondary mt-2">
                  Enter your Indian mobile number to receive an OTP
                </p>
              </div>

              <Button type="submit" variant="primary" fullWidth disabled={loading}>
                {loading ? <Spinner size="sm" /> : 'Send OTP'}
              </Button>
            </form>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <Input
                  type="text"
                  label="Enter OTP"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-foreground-secondary mt-2">
                  Enter the 6-digit code sent to {phone}
                </p>
              </div>

              <Button type="submit" variant="primary" fullWidth disabled={loading}>
                {loading ? <Spinner size="sm" /> : 'Verify OTP'}
              </Button>

              {/* Change Number Button */}
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                  setSuccess('');
                }}
                disabled={loading}
              >
                Change mobile number
              </Button>

              {/* Resend OTP */}
              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-sm text-foreground-secondary">
                    Resend OTP in {resendCooldown}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-sm text-brand-pink hover:text-brand-pink-hover transition-colors"
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-foreground-secondary">
              New to BookMyNai? Create an account after login
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
