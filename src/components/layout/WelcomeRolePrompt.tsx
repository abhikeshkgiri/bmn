'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Scissors, Store, UserRound, X } from 'lucide-react';
import type { UserRole } from '@/constants/roles';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const DISMISSAL_KEY = 'bmn:welcome-role-prompt-dismissed-at';
const DISMISSAL_DURATION_MS = 12 * 60 * 60 * 1000;

interface CurrentUserResponse {
  success?: boolean;
  user?: {
    role?: UserRole;
  };
}

const roleOptions = [
  {
    title: 'I want to book a slot',
    description: 'Find nearby salons, compare services, and book a time that works for you.',
    href: '/salons',
    action: 'Find salons',
    icon: UserRound,
  },
  {
    title: 'I own a salon',
    description: 'Add your salon, list services, and start receiving online bookings.',
    href: '/salon/signup',
    action: 'Add my salon',
    icon: Store,
  },
  {
    title: 'I am a barber',
    description: 'Join BookMyNai and connect with customers looking to book.',
    href: '/barber/signup',
    action: 'Join as a barber',
    icon: Scissors,
  },
];

function isRecentlyDismissed(): boolean {
  try {
    const dismissedAt = Number(window.localStorage.getItem(DISMISSAL_KEY));
    if (!Number.isFinite(dismissedAt) || dismissedAt <= 0) return false;
    if (Date.now() - dismissedAt < DISMISSAL_DURATION_MS) return true;
    window.localStorage.removeItem(DISMISSAL_KEY);
  } catch (error) {
    console.error('Unable to read welcome prompt preference:', error instanceof Error ? error.name : 'UnknownError');
  }
  return false;
}

export default function WelcomeRolePrompt() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isRecentlyDismissed()) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void fetch('/api/auth/me', { cache: 'no-store', signal: controller.signal })
        .then(async (response) => {
          if (controller.signal.aborted) return;
          if (response.status === 401) {
            setVisible(true);
            return;
          }
          const result = await response.json() as CurrentUserResponse;
          if (!response.ok || !result.success || !result.user?.role) {
            console.error(`Welcome prompt account check failed with status ${response.status}.`);
            return;
          }
          setVisible(false);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          console.error('Welcome prompt account check failed:', error instanceof Error ? error.name : 'UnknownError');
        });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (visible && !dialog.open) {
      dialog.showModal();
    } else if (!visible && dialog.open) {
      dialog.close();
    }
  }, [visible]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSAL_KEY, String(Date.now()));
    } catch (error) {
      console.error('Unable to save welcome prompt preference:', error instanceof Error ? error.name : 'UnknownError');
    }
    setVisible(false);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="welcome-role-prompt-title"
      aria-describedby="welcome-role-prompt-description"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-3xl rounded-3xl border border-white/70 bg-white p-0 text-foreground shadow-2xl backdrop:bg-brand-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="relative p-5 sm:p-8">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close welcome dialog"
          className="absolute right-4 top-4 rounded-full p-2 text-foreground-secondary transition hover:bg-neutral-100 hover:text-brand-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-pink"
        >
          <X size={20} />
        </button>

        <div className="mx-auto max-w-xl pr-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-pink">Welcome to BookMyNai</p>
          <h2 id="welcome-role-prompt-title" className="mt-2 text-2xl font-bold text-brand-black sm:text-3xl">
            How can we help you today?
          </h2>
          <p id="welcome-role-prompt-description" className="mt-2 text-sm text-foreground-secondary sm:text-base">
            Choose what brings you here and we’ll take you to the right place.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {roleOptions.map(({ title, description, href, action, icon: Icon }) => (
            <Card key={href} className="flex flex-col border-border p-4 transition-colors hover:border-brand-pink/50 hover:bg-brand-pink/[0.02]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
                <Icon size={20} aria-hidden="true" />
              </div>
              <h3 className="mt-3 font-semibold text-brand-black">{title}</h3>
              <p className="mt-1 flex-1 text-sm text-foreground-secondary">{description}</p>
              <Link
                href={href}
                onClick={dismiss}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-brand-pink px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-pink-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
              >
                {action}
                <ArrowRight size={16} className="ml-2" />
              </Link>
            </Card>
          ))}
        </div>

        <div className="mt-5 flex justify-center">
          <Button type="button" variant="ghost" onClick={dismiss}>
            Maybe later
          </Button>
        </div>
        <p className="mt-1 text-center text-xs text-foreground-secondary">
          We’ll remember your choice for 12 hours.
        </p>
      </div>
    </dialog>
  );
}
