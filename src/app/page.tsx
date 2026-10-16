import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Clock3,
  CreditCard,
  MapPin,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { SearchForm } from '@/components/search/SearchForm';
import HomeSalonFeed from '@/components/home/HomeSalonFeed';
import HomeNearbySalonFeed from '@/components/home/HomeNearbySalonFeed';
import { SALON_TYPE } from '@/constants/services';

export const dynamic = 'force-dynamic';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface QuickService {
  label: string;
  query: string;
  icon: typeof Scissors;
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

/* -------------------------------------------------------------------------- */
/*                               Static content                               */
/* -------------------------------------------------------------------------- */

const quickServices: QuickService[] = [
  { label: 'Haircut', query: 'haircut', icon: Scissors },
  { label: 'Beard', query: 'beard', icon: Scissors },
  { label: 'Haircut + Beard', query: 'haircut-beard', icon: Scissors },
  { label: 'Facial', query: 'facial', icon: Sparkles },
  { label: 'Hair Spa', query: 'hair-spa', icon: Sparkles },
  { label: 'Kids Haircut', query: 'kids-haircut', icon: Scissors },
  { label: 'Hair Color', query: 'hair-color', icon: Sparkles },
];

const workSteps: WorkStep[] = [
  {
    step: '01',
    title: 'Find',
    description: 'Search salons near you by area, city, or your live location.',
    icon: MapPin,
  },
  {
    step: '02',
    title: 'Check',
    description: 'See real open slots and pick a time that fits your day.',
    icon: Clock3,
  },
  {
    step: '03',
    title: 'Book',
    description: 'Reserve your slot in a few taps and pay securely online.',
    icon: CalendarCheck,
  },
  {
    step: '04',
    title: 'Visit',
    description: 'Walk in at your booked time and get served without waiting.',
    icon: BadgeCheck,
  },
];

const trustPoints: TrustPoint[] = [
  {
    title: 'Real Availability',
    description: 'Every slot you see comes from live salon schedules, not guesswork.',
    icon: Clock3,
  },
  {
    title: 'Verified Salons',
    description: 'We check every salon and barber before they go live.',
    icon: BadgeCheck,
  },
  {
    title: 'Secure Payments',
    description: 'Pay online with confidence. Your details stay protected.',
    icon: CreditCard,
  },
  {
    title: 'Easy Cancellation',
    description: 'Plans change. Cancel or reschedule in a couple of clicks.',
    icon: XCircle,
  },
];

/* -------------------------------------------------------------------------- */
/*                             Reusable components                            */
/* -------------------------------------------------------------------------- */

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-pink">{eyebrow}</p>
      ) : null}
      <h2 className="mt-3 text-3xl font-bold text-brand-black md:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-base text-foreground-secondary md:text-lg">{subtitle}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Homepage                                  */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <main>
        {/* --------------------------------- Hero --------------------------------- */}
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,45,122,0.12),_transparent_45%),linear-gradient(135deg,#fff_0%,#fff7fa_45%,#fff_100%)]">
          <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="pink" className="inline-flex items-center gap-2">
                <Sparkles size={14} />
                No more waiting at the salon
              </Badge>

              <h1 className="mt-6 text-4xl font-black tracking-tight text-brand-black md:text-6xl">
                Find a Salon.
                <span className="block text-brand-pink">Check Availability.</span>
                <span className="block">Book Your Slot.</span>
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-lg text-foreground-secondary md:text-xl">
                Discover salons near you, check real-time available slots, and book before you leave home.
              </p>
            </div>

            {/* Search + location card */}
            <div className="mx-auto mt-10 max-w-3xl">
              <SearchForm />

              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-foreground-secondary">
                <span className="flex items-center gap-1.5">
                  <Clock3 size={15} className="text-brand-pink" />
                  Live slot visibility
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck size={15} className="text-brand-pink" />
                  Verified salons
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-brand-pink" />
                  Secure booking
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------- Nearest Salons ---------------------------- */}
        <HomeNearbySalonFeed />

        {/* ---------------------------- Quick Services ---------------------------- */}
        <section className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow="Quick book" title="What do you need today?" />
            <Link href="/services" className="text-sm font-semibold text-brand-pink hover:underline">
              View all services
            </Link>
          </div>

          <div className="flex flex-wrap gap-3">
            {quickServices.map(({ label, query, icon: Icon }) => (
              <Link
                key={query}
                href={`/salons?service=${query}`}
                className="group flex items-center gap-2 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-medium text-brand-black shadow-sm transition-colors hover:border-brand-pink hover:bg-brand-pink/5"
              >
                <Icon size={16} className="text-brand-pink" />
                {label}
              </Link>
            ))}
          </div>
        </section>

        {/* ------------------------------ Men's Salons ------------------------------ */}
        <section className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow="Top rated" title="Top men’s salons" />
            <Link href="/salons" className="text-sm font-semibold text-brand-pink hover:underline">
              See all salons
            </Link>
          </div>

          <HomeSalonFeed salonTypes={[SALON_TYPE.MEN_SALON, SALON_TYPE.BARBERSHOP]} />
        </section>

        {/* ----------------------------- Women's Salons ----------------------------- */}
        <section className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow="Top rated" title="Top women’s salons" />
            <Link href="/salons" className="text-sm font-semibold text-brand-pink hover:underline">
              See all salons
            </Link>
          </div>

          <HomeSalonFeed salonTypes={[SALON_TYPE.WOMEN_SALON]} />
        </section>

        {/* ----------------------------- How It Works ----------------------------- */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <SectionHeading
            align="center"
            eyebrow="How BookMyNai works"
            title="No More Waiting."
            subtitle="Four simple steps from search to seat."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {workSteps.map(({ step, title, description, icon: Icon }) => (
              <div key={step} className="relative rounded-2xl border border-border bg-white p-6 shadow-sm">
                <span className="text-sm font-bold text-brand-pink/40">{step}</span>
                <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-brand-black">{title}</h3>
                <p className="mt-2 text-sm text-foreground-secondary">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ----------------------------- Trust Section ---------------------------- */}
        <section className="border-y border-border bg-brand-black py-16 text-white md:py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-300">Why people trust us</p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">Booking you can rely on</h2>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {trustPoints.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-pink/20 text-brand-pink">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-white/70">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------- Help Section ----------------------------- */}
        <section className="border-y border-border bg-neutral-50 py-14 md:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <SectionHeading
                eyebrow="Need a hand?"
                title="Book with confidence"
                subtitle="Review the booking and payment details, or contact support if you need help."
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <ButtonLink href="/support" variant="primary" className="w-full">Visit support <ArrowRight size={18} /></ButtonLink>
              <ButtonLink href="/refund-policy" variant="outline" className="w-full">Read cancellation policy</ButtonLink>
            </div>
          </div>
        </section>

        {/* ----------------------------- Business CTA ----------------------------- */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div className="relative overflow-hidden rounded-[2rem] border border-neutral-800 bg-gradient-to-br from-neutral-950 via-neutral-900 to-pink-950 p-8 text-white shadow-bookmynai-lg md:p-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-200">For business</p>
                <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">Bring your salon to BookMyNai</h2>
                <p className="mt-4 text-white/85">Create your profile, add your services and team, then submit it for administrator review before it appears to customers.</p>
                <ul className="mt-6 grid gap-2 text-sm text-white sm:grid-cols-2">
                  <li className="flex items-center gap-2 text-white"><BadgeCheck size={16} className="text-brand-pink" />Get discovered locally</li>
                  <li className="flex items-center gap-2 text-white"><BadgeCheck size={16} className="text-brand-pink" />Manage bookings & staff</li>
                  <li className="flex items-center gap-2 text-white"><BadgeCheck size={16} className="text-brand-pink" />Control prices & hours</li>
                  <li className="flex items-center gap-2 text-white"><BadgeCheck size={16} className="text-brand-pink" />Track your revenue</li>
                </ul>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <ButtonLink href="/salon/signup" variant="primary" size="lg" className="w-full">Register your salon <ArrowRight size={18} /></ButtonLink>
                <ButtonLink href="/salon" variant="secondary" size="lg" className="w-full">Salon portal</ButtonLink>
              </div>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
