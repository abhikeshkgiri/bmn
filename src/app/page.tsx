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
import Logo from '@/components/navbar/Logo';
import { Navbar, NavbarBrand, NavbarMenu, NavbarMenuItem, NavbarActions } from '@/components/navbar/Navbar';
import { Footer, FooterSection, FooterLink, FooterDivider, FooterBottom } from '@/components/footer/Footer';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { SearchForm } from '@/components/search/SearchForm';
import HomeSalonFeed from '@/components/home/HomeSalonFeed';

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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-neutral-50 p-8 text-center">
      <p className="text-sm text-foreground-secondary">{message}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Homepage                                  */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-foreground">
      {/* -------------------------------- Navbar -------------------------------- */}
      <Navbar>
        <NavbarBrand>
          <Logo size="md" />
        </NavbarBrand>
        <NavbarMenu>
          <NavbarMenuItem href="/search">Search</NavbarMenuItem>
          <NavbarMenuItem href="/salons?location=1">Location</NavbarMenuItem>
          <NavbarMenuItem href="/salons">Salons</NavbarMenuItem>
          <NavbarMenuItem href="/services">Services</NavbarMenuItem>
          <NavbarMenuItem href="/offers">Offers</NavbarMenuItem>
          <NavbarMenuItem href="/salon">For Business</NavbarMenuItem>
        </NavbarMenu>
        <NavbarActions>
          <Link href="/login">
            <Button variant="outline" size="sm">
              Login
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary" size="sm">
              Sign Up
            </Button>
          </Link>
        </NavbarActions>
      </Navbar>

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

        {/* ----------------------------- Nearby Salons ---------------------------- */}
        <section className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow="Near you" title="Salons Near You" />
            <Link href="/salons" className="text-sm font-semibold text-brand-pink hover:underline">
              See all salons
            </Link>
          </div>

          <HomeSalonFeed />
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

        {/* -------------------------------- Offers -------------------------------- */}
        <section className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow="Save more" title="Offers & Coupons" />
            <Link href="/offers" className="text-sm font-semibold text-brand-pink hover:underline">
              View all offers
            </Link>
          </div>

          {/*
            Offers must come from real active coupons in the database.
            Render the offers grid here once a live coupon feed is connected.
            Until then, show a clear, honest empty state — never fake discounts.
          */}
          <EmptyState message="No active offers right now. New deals from verified salons will appear here as soon as they go live." />
        </section>

        {/* ---------------------------- Customer Reviews -------------------------- */}
        <section className="border-y border-border bg-neutral-50 py-14 md:py-20">
          <div className="mx-auto max-w-7xl px-4">
            <SectionHeading
              align="center"
              eyebrow="Real feedback"
              title="What Customers Say"
              subtitle="Reviews come from real, verified bookings only."
            />

            <div className="mt-10">
              {/*
                Render verified booking reviews from the database here.
                Only show reviews tied to a completed booking. No fake testimonials.
              */}
              <EmptyState message="Verified reviews will show here once customers complete their first bookings." />
            </div>
          </div>
        </section>

        {/* ----------------------------- Business CTA ----------------------------- */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div
            className="relative overflow-hidden rounded-[2rem] border border-border p-8 text-white shadow-bookmynai-lg md:p-12"
            style={{
              backgroundImage: "linear-gradient(135deg, rgba(17,17,17,0.78), rgba(65,15,42,0.72)), url('https://img.magnific.com/free-photo/studio-background-concept-abstract-empty-light-gradient-purple-studio-room-background-product_1258-94417.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white custom">For business</p>
                <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl custom">Are you a Salon or Barber?</h2>
                <p className="mt-4 text-white custom">Get discovered by nearby customers, manage your services and prices, set your working hours, and receive bookings straight to your dashboard.</p>
                <ul className="mt-6 grid gap-2 text-sm text-white sm:grid-cols-2">
                  <li className="flex items-center gap-2 text-white"><BadgeCheck size={16} className="text-brand-pink" />Get discovered locally</li>
                  <li className="flex items-center gap-2 text-white"><BadgeCheck size={16} className="text-brand-pink" />Manage bookings & staff</li>
                  <li className="flex items-center gap-2 text-white"><BadgeCheck size={16} className="text-brand-pink" />Control prices & hours</li>
                  <li className="flex items-center gap-2 text-white"><BadgeCheck size={16} className="text-brand-pink" />Track your revenue</li>
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

      {/* -------------------------------- Footer -------------------------------- */}
      <Footer>
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <FooterSection title="Product">
              <FooterLink href="/salons">Browse Salons</FooterLink>
              <FooterLink href="/services">Services</FooterLink>
              <FooterLink href="/offers">Offers</FooterLink>
              <FooterLink href="/search">Search</FooterLink>
            </FooterSection>

            <FooterSection title="For Businesses">
              <FooterLink href="/salon">Salon portal</FooterLink>
              <FooterLink href="/salon">Get Started</FooterLink>
              <FooterLink href="/support">Support</FooterLink>
            </FooterSection>

            <FooterSection title="Company">
              <FooterLink href="/support">About Us</FooterLink>
              <FooterLink href="/support">Blog</FooterLink>
              <FooterLink href="/support">Careers</FooterLink>
              <FooterLink href="/support">Press</FooterLink>
            </FooterSection>

            <FooterSection title="Support">
              <FooterLink href="/support">Help Center</FooterLink>
              <FooterLink href="/support">Contact Us</FooterLink>
              <FooterLink href="/support">FAQ</FooterLink>
              <FooterLink href="/support">Status</FooterLink>
            </FooterSection>

            <FooterSection title="Legal">
              <FooterLink href="/support">Privacy Policy</FooterLink>
              <FooterLink href="/support">Terms of Service</FooterLink>
              <FooterLink href="/support">Refund Policy</FooterLink>
              <FooterLink href="/support">Cookie Policy</FooterLink>
            </FooterSection>
          </div>

          <FooterDivider />

          <FooterBottom>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-8">
                <Logo size="sm" />
                <p className="text-sm text-foreground-secondary">© 2026 BookMyNai. All rights reserved.</p>
              </div>
              <div className="flex gap-4 text-sm text-foreground-secondary">
                <a href="https://twitter.com" className="hover:text-brand-pink" aria-label="Twitter">
                  Twitter
                </a>
                <a href="https://facebook.com" className="hover:text-brand-pink" aria-label="Facebook">
                  Facebook
                </a>
                <a href="https://instagram.com" className="hover:text-brand-pink" aria-label="Instagram">
                  Instagram
                </a>
                <a href="https://linkedin.com" className="hover:text-brand-pink" aria-label="LinkedIn">
                  LinkedIn
                </a>
              </div>
            </div>
          </FooterBottom>
        </div>
      </Footer>
    </div>
  );
}
