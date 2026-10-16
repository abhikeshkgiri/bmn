'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Logo from '@/components/navbar/Logo';
import NavbarAccountActions from '@/components/navbar/NavbarAccountActions';

const navigationItems = [
  { href: '/search', label: 'Find a salon' },
  { href: '/salons', label: 'Salons' },
  { href: '/services', label: 'Services' },
  { href: '/offers', label: 'Offers' },
  { href: '/salon', label: 'For Business' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="BookMyNai home" className="shrink-0">
          <Logo size="md" />
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink ${
                isActive(item.href)
                  ? 'bg-pink-50 text-pink-800'
                  : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <NavbarAccountActions />
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink lg:hidden"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-site-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div id="mobile-site-navigation" className="border-t border-border bg-white px-4 py-3 shadow-md lg:hidden">
          <nav aria-label="Mobile navigation" className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={`min-h-11 rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  isActive(item.href) ? 'bg-pink-50 text-pink-800' : 'text-neutral-800 hover:bg-neutral-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-3 sm:hidden">
              <NavbarAccountActions />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
