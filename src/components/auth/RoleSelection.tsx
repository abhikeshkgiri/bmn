'use client';

import { ArrowRight, Store, UserRound } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button, { ButtonLink } from '@/components/ui/Button';

interface RoleSelectionProps {
  mode: 'login' | 'signup';
  onSelect?: (role: 'customer' | 'salonOwner') => void;
}

const roles = [
  {
    id: 'customer' as const,
    title: 'Continue as Customer',
    description: 'Discover nearby salons, compare services, and manage your appointments.',
    icon: UserRound,
  },
  {
    id: 'salonOwner' as const,
    title: 'Continue as Salon Owner',
    description: 'Register your salon, manage your team, and accept appointments.',
    icon: Store,
  },
];

export default function RoleSelection({ mode, onSelect }: RoleSelectionProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-pink">
          BookMyNai
        </p>
        <h2 className="mt-2 text-2xl font-bold text-brand-black">
          {mode === 'login' ? 'How would you like to continue?' : 'Choose your account type'}
        </h2>
        <p className="mt-2 text-sm text-foreground-secondary">
          {mode === 'login'
            ? 'We will use your existing verified account and permissions.'
            : 'Both account types use the same secure phone verification.'}
        </p>
      </div>

      {roles.map(({ id, title, description, icon: Icon }) => (
        <Card
          key={id}
          className="border border-border/70 p-5 transition-colors hover:border-brand-pink/60 hover:bg-brand-pink/[0.03]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
              <Icon size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-brand-black">{title}</h3>
              <p className="mt-1 text-sm text-foreground-secondary">{description}</p>
              {onSelect ? (
                <Button
                  type="button"
                  variant="primary"
                  className="mt-4"
                  onClick={() => onSelect(id)}
                >
                  Continue <ArrowRight size={16} className="ml-2" />
                </Button>
              ) : (
                <ButtonLink
                  href={id === 'salonOwner' ? '/salon/signup' : '/signup'}
                  variant="primary"
                  className="mt-4"
                >
                    {id === 'salonOwner' ? 'Register a Salon' : 'Create Customer Account'}
                    <ArrowRight size={16} className="ml-2" />
                </ButtonLink>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
