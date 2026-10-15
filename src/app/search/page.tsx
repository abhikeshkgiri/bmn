'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Navbar, NavbarBrand, NavbarMenu, NavbarMenuItem, NavbarActions } from '@/components/navbar/Navbar';
import NavbarAccountActions from '@/components/navbar/NavbarAccountActions';
import { Footer, FooterSection, FooterLink } from '@/components/footer/Footer';
import Logo from '@/components/navbar/Logo';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Loading';
import { MapPin, Star, Search } from 'lucide-react';
import { getSupportedLaunchCity } from '@/constants/launch-cities';

interface Salon {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  isDemoPreview?: boolean;
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
  const service = searchParams.get('service') || '';

  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(!!location || !!q || !!service);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const fetchSalons = async () => {
      try {
        if (!location && !q && !service) {
          setSalons([]);
          setError(null);
          setLoading(false);
          return;
        }

        const params = new URLSearchParams();
        if (location) {
          params.append(getSupportedLaunchCity(location) ? 'city' : 'area', location);
        }
        if (q) params.append('search', q);
        if (service) params.append('serviceSearch', service.slice(0, 80));
        params.append('limit', '20');

        const response = await fetch(`/api/salons?${params}`);
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(`Salon search failed with status ${response.status}`);
        }
        setSalons(Array.isArray(result.data) ? result.data : []);
        setError(null);
      } catch {
        setError('Failed to load salons. Please try again.');
        setSalons([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSalons();
  }, [location, q, service, retryKey]);

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
          <NavbarMenuItem href="/salon">For Business</NavbarMenuItem>
        </NavbarMenu>
        <NavbarActions>
          <NavbarAccountActions />
        </NavbarActions>
      </Navbar>

      <main className="mx-auto max-w-7xl px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-brand-black mb-2">Search Results</h1>
          <p className="text-foreground-secondary text-lg">
            {location || q || service ? (
              <>
                Showing salons
                {q && <> matching <strong>&quot;{q}&quot;</strong></>}
                {service && <> offering <strong>&quot;{service}&quot;</strong></>}
                {location && <> in <strong>&quot;{location}&quot;</strong></>}
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
                maxLength={80}
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
                maxLength={100}
                placeholder="Search salon name or area"
                className="w-full bg-transparent text-sm text-brand-black outline-none placeholder:text-foreground-secondary"
                aria-label="Search salon name or area"
              />
            </div>

            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-neutral-50 px-3 py-2.5">
              <Search size={18} className="text-brand-pink" />
              <input
                type="search"
                name="service"
                defaultValue={service}
                maxLength={80}
                placeholder="Search active services"
                className="w-full bg-transparent text-sm text-brand-black outline-none placeholder:text-foreground-secondary"
                aria-label="Search active salon services"
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
            <div className="flex justify-center gap-3">
              <Button variant="primary" onClick={() => setRetryKey((key) => key + 1)}>Try again</Button>
              <Link href="/"><Button variant="outline">Back to Home</Button></Link>
            </div>
          </Card>
        ) : salons.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-foreground-secondary mb-4 text-lg">
              {location || q || service ? (
                <>
                  No salons found
                  {q && <> matching <strong>&quot;{q}&quot;</strong></>}
                  {service && <> offering <strong>&quot;{service}&quot;</strong></>}
                  {location && <> in <strong>&quot;{location}&quot;</strong></>}
                </>
              ) : (
                'Enter a location or service to search'
              )}
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
                    {salon.isDemoPreview && <Badge variant="info" className="mt-1">Demo preview</Badge>}
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

                  {!salon.isDemoPreview && salon.rating !== undefined && salon.rating > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1 rounded-lg bg-neutral-50 px-2 py-1 text-sm font-semibold text-brand-black">
                        <Star size={13} className="fill-yellow-400 text-yellow-400" />
                        {salon.rating}
                      </div>
                      {salon.reviewCount !== undefined && salon.reviewCount > 0 && (
                        <span className="text-xs text-foreground-secondary">
                          ({salon.reviewCount} reviews)
                        </span>
                      )}
                      {salon.isDemoPreview && (
                        <p className="text-xs text-info-700">Illustrative listing; not a real salon.</p>
                      )}
                    </div>
                  )}

                  <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                    <Link href={`/salons/${salon.slug}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/salons/${salon.slug}?book=1`}>
                      <Button variant="primary" size="sm" className="w-full">
                        {salon.isDemoPreview ? 'Preview booking flow' : 'Book Now'}
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
          <FooterLink href="/salon">Register Salon</FooterLink>
          <FooterLink href="/salon">Register Barber</FooterLink>
          <FooterLink href="/support">Business FAQ</FooterLink>
          <FooterLink href="/support">Business Support</FooterLink>
        </FooterSection>
        <FooterSection>
          <h4 className="font-semibold text-foreground">Company</h4>
          <FooterLink href="/support">About Us</FooterLink>
          <FooterLink href="/support">Blog</FooterLink>
          <FooterLink href="/support">Careers</FooterLink>
          <FooterLink href="/support">Press</FooterLink>
        </FooterSection>
        <FooterSection>
          <h4 className="font-semibold text-foreground">Support</h4>
          <FooterLink href="/support">Help Center</FooterLink>
          <FooterLink href="/support">Contact Us</FooterLink>
          <FooterLink href="/feedback">Send Feedback</FooterLink>
          <FooterLink href="/report">Report Issue</FooterLink>
        </FooterSection>
        <FooterSection>
          <h4 className="font-semibold text-foreground">Legal</h4>
          <FooterLink href="/support">Privacy Policy</FooterLink>
          <FooterLink href="/support">Terms of Service</FooterLink>
          <FooterLink href="/support">Cookie Policy</FooterLink>
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
