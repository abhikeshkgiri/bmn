'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Navbar, NavbarBrand, NavbarMenu, NavbarMenuItem, NavbarActions } from '@/components/navbar/Navbar';
import { Footer, FooterSection, FooterLink } from '@/components/footer/Footer';
import Logo from '@/components/navbar/Logo';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Loading';
import { MapPin, Star, Search } from 'lucide-react';
import { getDemoDelhiSalons } from '@/lib/demo-delhi';

interface Salon {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  address?: {
    city?: string;
    area?: string;
    state?: string;
  };
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const location = searchParams.get('location') || '';
  const q = searchParams.get('q') || '';

  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(!!location || !!q);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSalons = async () => {
      try {
        if (!location && !q) {
          setSalons([]);
          setError(null);
          setLoading(false);
          return;
        }

        const params = new URLSearchParams();
        if (location) params.append('city', location);
        if (q) params.append('search', q);
        params.append('limit', '20');

        try {
          const response = await fetch(`/api/salons?${params}`);
          const result = await response.json();

          if (result.success && result.data?.length) {
            setSalons(result.data || []);
            setError(null);
            setLoading(false);
            return;
          }
        } catch {
          // Fall through to demo data if MongoDB is unavailable
        }

        const demoSalons = getDemoDelhiSalons({ location, q, limit: 20 });
        setSalons(demoSalons as unknown as Salon[]);
        setError(null);
      } catch {
        setError('Failed to load salons');
        setSalons([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSalons();
  }, [location, q]);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
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
          <NavbarMenuItem href="/business">For Business</NavbarMenuItem>
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

      <main className="mx-auto max-w-7xl px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-brand-black mb-2">Search Results</h1>
          <p className="text-foreground-secondary text-lg">
            {location || q ? (
              <>
                Showing salons for <strong>&quot;{location || q}&quot;</strong>
              </>
            ) : (
              'Enter a location or service to search'
            )}
          </p>
        </div>

        {/* Search Box */}
        <Card className="mb-8 p-4">
          <form action="/search" method="GET" className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-neutral-50 px-3 py-2.5">
              <MapPin size={18} className="text-brand-pink" />
              <input
                type="text"
                name="location"
                defaultValue={location}
                placeholder="Enter location"
                className="w-full bg-transparent text-sm text-brand-black outline-none placeholder:text-foreground-secondary"
              />
            </div>

            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-neutral-50 px-3 py-2.5">
              <Search size={18} className="text-brand-pink" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search service or salon"
                className="w-full bg-transparent text-sm text-brand-black outline-none placeholder:text-foreground-secondary"
              />
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full md:w-auto">
              Search
            </Button>
          </form>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link href="/">
              <Button variant="primary">Back to Home</Button>
            </Link>
          </Card>
        ) : salons.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-foreground-secondary mb-4 text-lg">
              {location || q
                ? `No salons found for "${location || q}"`
                : 'Enter a location or service to search'}
            </p>
            <Link href="/">
              <Button variant="primary">Back to Home</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {salons.map((salon) => (
              <Card
                key={salon._id}
                className="group flex flex-col overflow-hidden transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-brand-pink/15 via-neutral-100 to-white flex items-center justify-center">
                  <Search size={40} className="text-brand-pink/40" />
                </div>

                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <h3 className="font-semibold text-brand-black line-clamp-2">{salon.name}</h3>
                    <p className="flex items-center gap-1 text-sm text-foreground-secondary mt-1">
                      <MapPin size={13} className="text-brand-pink" />
                      {salon.address?.area || salon.address?.city || 'Location'}
                    </p>
                  </div>

                  {salon.description && (
                    <p className="text-sm text-foreground-secondary line-clamp-2">
                      {salon.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 rounded-lg bg-neutral-50 px-2 py-1 text-sm font-semibold text-brand-black">
                      <Star size={13} className="fill-yellow-400 text-yellow-400" />
                      {salon.rating ?? 0}
                    </div>
                    <span className="text-xs text-foreground-secondary">
                      ({salon.reviewCount ?? 0} reviews)
                    </span>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                    <Link href={`/salons/${salon.slug}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/salons/${salon.slug}?book=1`}>
                      <Button variant="primary" size="sm" className="w-full">
                        Book Now
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer className="mt-16">
        <FooterSection>
          <h4 className="font-semibold text-foreground">Product</h4>
          <FooterLink href="/salons">Find Salons</FooterLink>
          <FooterLink href="/barbers">Find Barbers</FooterLink>
          <FooterLink href="/services">Services</FooterLink>
          <FooterLink href="/offers">Offers & Deals</FooterLink>
        </FooterSection>
        <FooterSection>
          <h4 className="font-semibold text-foreground">For Businesses</h4>
          <FooterLink href="/business/signup">Register Salon</FooterLink>
          <FooterLink href="/business/signup">Register Barber</FooterLink>
          <FooterLink href="/business/faq">Business FAQ</FooterLink>
          <FooterLink href="/business/support">Business Support</FooterLink>
        </FooterSection>
        <FooterSection>
          <h4 className="font-semibold text-foreground">Company</h4>
          <FooterLink href="/about">About Us</FooterLink>
          <FooterLink href="/blog">Blog</FooterLink>
          <FooterLink href="/careers">Careers</FooterLink>
          <FooterLink href="/press">Press</FooterLink>
        </FooterSection>
        <FooterSection>
          <h4 className="font-semibold text-foreground">Support</h4>
          <FooterLink href="/help">Help Center</FooterLink>
          <FooterLink href="/contact">Contact Us</FooterLink>
          <FooterLink href="/feedback">Send Feedback</FooterLink>
          <FooterLink href="/report">Report Issue</FooterLink>
        </FooterSection>
        <FooterSection>
          <h4 className="font-semibold text-foreground">Legal</h4>
          <FooterLink href="/privacy">Privacy Policy</FooterLink>
          <FooterLink href="/terms">Terms of Service</FooterLink>
          <FooterLink href="/cookies">Cookie Policy</FooterLink>
          <FooterLink href="/disclaimer">Disclaimer</FooterLink>
        </FooterSection>
      </Footer>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
