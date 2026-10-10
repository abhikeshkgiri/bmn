'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Clock3,
  CreditCard,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  ImageOff,
  XCircle,
} from 'lucide-react';
import Logo from '@/components/navbar/Logo';
import { Navbar, NavbarBrand, NavbarMenu, NavbarMenuItem, NavbarActions } from '@/components/navbar/Navbar';
import { Footer, FooterSection, FooterLink, FooterDivider, FooterBottom } from '@/components/footer/Footer';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { SearchForm } from '@/components/search/SearchForm';
import ComingSoonLocation from '@/components/location/ComingSoonLocation';
import SupportedCitySelect from '@/components/location/SupportedCitySelect';
import { getSupportedLaunchCity } from '@/constants/launch-cities';

const DEFAULT_LOCATION = 'Delhi';

interface SalonAddress {
  city?: string;
  area?: string;
  state?: string;
}

interface HomeSalon {
  _id: string;
  name: string;
  slug: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string | null;
  address?: SalonAddress;
}

interface ApiHomeSalon {
  _id: string;
  name: string;
  slug: string;
  rating?: number;
  reviewCount?: number;
  logo?: string | null;
  coverImage?: string | null;
  images?: string[];
  address?: SalonAddress;
}

interface WorkStep {
  step: string;
  title: string;
  description: string;
  icon: typeof Search;
}

interface TrustPoint {
  title: string;
  description: string;
  icon: typeof ShieldCheck;
}

const workSteps: WorkStep[] = [
  { step: '01', title: 'Find', description: 'Search salons near you by area, city, or your live location.', icon: MapPin },
  { step: '02', title: 'Check', description: 'See real open slots and pick a time that fits your day.', icon: Clock3 },
  { step: '03', title: 'Book', description: 'Reserve your slot in a few taps and pay securely online.', icon: CalendarCheck },
  { step: '04', title: 'Visit', description: 'Walk in at your booked time and get served without waiting.', icon: BadgeCheck },
];

const trustPoints: TrustPoint[] = [
  { title: 'Real Availability', description: 'Every slot you see comes from live salon schedules, not guesswork.', icon: Clock3 },
  { title: 'Verified Salons', description: 'We check every salon and barber before they go live.', icon: BadgeCheck },
  { title: 'Secure Payments', description: 'Pay online with confidence. Your details stay protected.', icon: CreditCard },
  { title: 'Easy Cancellation', description: 'Plans change. Cancel or reschedule in a couple of clicks.', icon: XCircle },
];

function normalizeCity(value: string | null | undefined, fallback = DEFAULT_LOCATION): string {
  if (!value) return fallback;
  const cleaned = value.trim();
  if (!cleaned) return fallback;
  return getSupportedLaunchCity(cleaned)?.city || cleaned;
}

async function fetchSalonsForLocation(city: string, limit = 12): Promise<HomeSalon[] | null> {
  const normalized = normalizeCity(city, DEFAULT_LOCATION);
  if (!getSupportedLaunchCity(normalized)) return [];

  try {
    const response = await fetch(`/api/salons?city=${encodeURIComponent(normalized)}&limit=${limit}`);
    const result = (await response.json()) as { success?: boolean; data?: ApiHomeSalon[] };
    if (!response.ok || !result?.success || !Array.isArray(result.data)) {
      console.error(`Salon listing request failed with status ${response.status}`);
      return null;
    }
    return result.data.map((salon) => ({
      _id: salon._id,
      name: salon.name,
      slug: salon.slug,
      rating: salon.rating,
      reviewCount: salon.reviewCount,
      imageUrl: salon.coverImage || salon.images?.[0] || salon.logo || null,
      address: salon.address,
    }));
  } catch {
    console.error('Unable to load salon listings for the selected launch city');
    return null;
  }
}

function locationLabel(salon: HomeSalon): string {
  return salon.address?.area || salon.address?.city || 'Nearby';
}

function SectionHeading({ eyebrow, title, subtitle, align = 'left' }: { eyebrow?: string; title: string; subtitle?: string; align?: 'left' | 'center'; }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-pink">{eyebrow}</p> : null}
      <h2 className="mt-3 text-3xl font-bold text-brand-black md:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-base text-foreground-secondary md:text-lg">{subtitle}</p> : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-neutral-50 p-8 text-center">
      <p className="text-sm text-foreground-secondary">{message}</p>
    </div>
  );
}

function SalonCard({ salon }: { salon: HomeSalon }) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-bookmynai-lg">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
        {salon.imageUrl ? (
          // Salon image URLs are user-managed; keep them lazy without imposing a global remote-host allow-list.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={salon.imageUrl}
            alt={`${salon.name} salon`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-foreground-muted" aria-hidden="true">
            <ImageOff size={32} />
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-brand-black">{salon.name}</h3>
            <p className="flex items-center gap-1 text-sm text-foreground-secondary"><MapPin size={13} className="text-brand-pink" />{locationLabel(salon)}</p>
          </div>
          {typeof salon.rating === 'number' && salon.rating > 0 ? (
            <div className="flex items-center gap-1 rounded-lg bg-neutral-50 px-2 py-1 text-sm font-semibold text-brand-black">
              <Star size={13} className="fill-yellow-400 text-yellow-400" />
              {salon.rating}
            </div>
          ) : null}
        </div>

        {typeof salon.reviewCount === 'number' && salon.reviewCount > 0 ? (
          <p className="text-sm text-foreground-secondary">{salon.reviewCount} reviews</p>
        ) : null}
        <Link href={`/salons/${salon.slug}`} className="mt-auto pt-1">
          <Button variant="outline" size="sm" className="w-full">View salon</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION);
  const [salons, setSalons] = useState<HomeSalon[]>([]);
  const [loadingSalons, setLoadingSalons] = useState(true);
  const [salonLoadError, setSalonLoadError] = useState<string | null>(null);
  const locationRequestId = useRef(0);

  const loadForLocation = useCallback(async (city: string) => {
    const normalized = normalizeCity(city, DEFAULT_LOCATION);
    const requestId = ++locationRequestId.current;
    setSelectedLocation(normalized);
    setLoadingSalons(true);
    setSalonLoadError(null);
    const nextSalons = await fetchSalonsForLocation(normalized, 12);
    if (requestId !== locationRequestId.current) return;
    if (nextSalons === null) {
      setSalons([]);
      setSalonLoadError('We could not load salon listings right now. Please try again later.');
    } else {
      setSalons(nextSalons);
    }
    setLoadingSalons(false);
  }, []);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('bookmynai-location') : null;
    const startLocation = stored ? normalizeCity(stored, DEFAULT_LOCATION) : DEFAULT_LOCATION;
    const timeoutId = window.setTimeout(() => {
      void loadForLocation(startLocation);
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      locationRequestId.current += 1;
    };
  }, [loadForLocation]);

  const unsupportedCity = !getSupportedLaunchCity(selectedLocation);

  const handleLocationChange = async (city: string) => {
    const normalized = normalizeCity(city, DEFAULT_LOCATION);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('bookmynai-location', normalized);
    }
    await loadForLocation(normalized);
  };

  return (
    <div className="min-h-screen bg-white text-foreground">
      <Navbar aria-label="Customer navigation">
        <NavbarBrand><Logo size="md" /></NavbarBrand>
        <NavbarMenu className="hidden md:flex">
          <NavbarMenuItem href="/search">Search</NavbarMenuItem>
          <NavbarMenuItem href="/salons">Salons</NavbarMenuItem>
          <NavbarMenuItem href="/services">Services</NavbarMenuItem>
          <NavbarMenuItem href="/salon">For Business</NavbarMenuItem>
        </NavbarMenu>
        <details className="relative ml-auto md:hidden">
          <summary className="cursor-pointer list-none rounded-lg border border-border px-3 py-2 text-sm font-medium text-brand-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink">
            Menu
          </summary>
          <div className="absolute right-0 z-20 mt-2 flex min-w-48 flex-col gap-1 rounded-xl border border-border bg-white p-2 shadow-bookmynai-lg">
            <Link className="rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" href="/search">Search</Link>
            <Link className="rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" href="/salons">Salons</Link>
            <Link className="rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" href="/services">Services</Link>
            <Link className="rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" href="/salon">For Business</Link>
            <Link className="rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" href="/login">Login</Link>
            <Link className="rounded-lg px-3 py-2 text-sm hover:bg-neutral-50" href="/signup/choose">Sign Up</Link>
          </div>
        </details>
        <NavbarActions className="hidden md:flex">
          <Link href="/login"><Button variant="outline" size="sm">Login</Button></Link>
          <Link href="/signup/choose"><Button variant="outline" size="sm">Sign Up</Button></Link>
        </NavbarActions>
      </Navbar>

      <main>
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,45,122,0.12),_transparent_45%),linear-gradient(135deg,#fff_0%,#fff7fa_45%,#fff_100%)]">
          <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="pink" className="inline-flex items-center gap-2"><Sparkles size={14} />No more waiting at the salon</Badge>
              <h1 className="mt-6 text-4xl font-black tracking-tight text-brand-black md:text-6xl">Find a Salon.<span className="block text-brand-pink">Check Availability.</span><span className="block">Book Your Slot.</span></h1>
              <p className="mx-auto mt-5 max-w-xl text-lg text-foreground-secondary md:text-xl">{unsupportedCity ? 'Choose a supported city to discover verified salons.' : `Discover verified salons in ${selectedLocation} and find the right place for your next visit.`}</p>
            </div>

            <div className="mx-auto mt-10 max-w-3xl">
              <div className="rounded-2xl border border-border bg-white p-3 shadow-bookmynai-lg md:p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-border bg-neutral-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <MapPin size={18} className="shrink-0 text-brand-pink" />
                      <span className="truncate text-sm font-medium text-brand-black">{selectedLocation}, India</span>
                    </div>
                    <div className="w-full sm:w-56">
                      <SupportedCitySelect
                        value={getSupportedLaunchCity(selectedLocation)?.city || ''}
                        label="Choose a supported city"
                        onChange={({ city }) => void handleLocationChange(city)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5"><SearchForm /></div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-foreground-secondary">
                <span className="flex items-center gap-1.5"><Clock3 size={15} className="text-brand-pink" />Explore salon availability</span>
                <span className="flex items-center gap-1.5"><BadgeCheck size={15} className="text-brand-pink" />Verified salons</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-brand-pink" />Secure booking</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-pink">Explore</p>
              <h2 className="mt-2 text-2xl font-bold text-brand-black">Browse salon services</h2>
              <p className="mt-2 text-sm text-foreground-secondary">Explore services listed by salons near you.</p>
            </div>
            <Link href="/services" className="shrink-0">
              <Button variant="outline">Browse services <ArrowRight size={16} className="ml-2" /></Button>
            </Link>
          </div>
        </section>

        {unsupportedCity ? (
          <section className="mx-auto max-w-7xl px-4 py-10">
            <ComingSoonLocation city={selectedLocation} onChooseCity={(city) => void handleLocationChange(city)} />
          </section>
        ) : (
        <section className="mx-auto max-w-7xl px-4 py-14 md:py-20" aria-labelledby="salons-heading">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div id="salons-heading"><SectionHeading eyebrow="Explore nearby" title={`Salons in ${selectedLocation}`} /></div>
            <Link href={`/salons?city=${encodeURIComponent(selectedLocation)}`} className="text-sm font-semibold text-brand-pink hover:underline">See all salons</Link>
          </div>

          {loadingSalons ? (
            <p role="status" className="rounded-2xl border border-border bg-neutral-50 p-8 text-center text-sm text-foreground-secondary">
              Loading salons in {selectedLocation}…
            </p>
          ) : salonLoadError ? (
            <div role="alert" className="rounded-2xl border border-error-500/30 bg-error-500/5 p-8 text-center">
              <p className="mb-4 text-sm text-error-600">{salonLoadError}</p>
              <Button variant="outline" onClick={() => void loadForLocation(selectedLocation)}>Try again</Button>
            </div>
          ) : salons.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {salons.slice(0, 6).map((salon) => <SalonCard key={salon._id} salon={salon} />)}
            </div>
          ) : (
            <EmptyState message={`No salons are listed in ${selectedLocation} yet. Try choosing another supported city above.`} />
          )}
        </section>
        )}

        <section className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <SectionHeading align="center" eyebrow="How BookMyNai works" title="No More Waiting." subtitle="Four simple steps from search to seat." />
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {workSteps.map(({ step, title, description, icon: Icon }) => (
              <div key={step} className="relative rounded-2xl border border-border bg-white p-6 shadow-sm">
                <span className="text-sm font-bold text-brand-pink/40">{step}</span>
                <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink"><Icon size={22} /></div>
                <h3 className="mt-4 text-lg font-semibold text-brand-black">{title}</h3>
                <p className="mt-2 text-sm text-foreground-secondary">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-brand-black py-16 text-white md:py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-300">Why people trust us</p><h2 className="mt-3 text-3xl font-bold md:text-4xl">Booking you can rely on</h2></div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {trustPoints.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-pink/20 text-brand-pink"><Icon size={20} /></div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-white/70">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div
            className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-brand-black via-neutral-900 to-brand-pink/80 p-8 text-white shadow-bookmynai-lg md:p-12"
          >
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl !text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] !text-white">For business</p>
                <h2 className="mt-3 text-3xl font-bold !text-white md:text-4xl">Are you a Salon or Barber?</h2>
                <p className="mt-4 !text-white">Get discovered by nearby customers, manage your services and prices, set your working hours, and receive bookings straight to your dashboard.</p>
                <ul className="mt-6 grid gap-2 text-sm !text-white sm:grid-cols-2">
                  <li className="flex items-center gap-2 !text-white"><BadgeCheck size={16} className="text-brand-pink" />Get discovered locally</li>
                  <li className="flex items-center gap-2 !text-white"><BadgeCheck size={16} className="text-brand-pink" />Manage bookings & staff</li>
                  <li className="flex items-center gap-2 !text-white"><BadgeCheck size={16} className="text-brand-pink" />Control prices & hours</li>
                  <li className="flex items-center gap-2 !text-white"><BadgeCheck size={16} className="text-brand-pink" />Track your revenue</li>
                </ul>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link href="/salon"><Button variant="primary" size="lg" className="w-full">Sign Up for Business <ArrowRight size={18} className="ml-2" /></Button></Link>
                <Link href="/salon"><Button variant="outline" size="lg" className="w-full border-white bg-transparent text-white hover:bg-white/10 hover:text-white">Learn More</Button></Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer>
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FooterSection title="Explore"><FooterLink href="/salons">Browse Salons</FooterLink><FooterLink href="/services">Services</FooterLink><FooterLink href="/search">Search</FooterLink></FooterSection>
            <FooterSection title="For Businesses"><FooterLink href="/salon">Salon portal</FooterLink><FooterLink href="/salon">Get Started</FooterLink></FooterSection>
            <FooterSection title="Support"><FooterLink href="/support">Help & Contact</FooterLink></FooterSection>
          </div>
          <FooterDivider />
          <FooterBottom>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-8"><Logo size="sm" /><p className="text-sm text-foreground-secondary">© 2026 BookMyNai. All rights reserved.</p></div>
            </div>
          </FooterBottom>
        </div>
      </Footer>
    </div>
  );
}
