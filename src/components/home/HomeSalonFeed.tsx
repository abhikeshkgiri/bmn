import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { MapPin, Scissors, Star } from 'lucide-react';
import { listSalons } from '@/services/salon.service';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { HOME_SALON_CACHE_TAG } from '@/lib/home-salon-cache';

const getTopSalons = unstable_cache(
  async () => {
    const result = await listSalons({ limit: 3, sortBy: 'rating', isActive: true });
    return result.salons.slice(0, 3).map((salon) => ({
      _id: salon._id.toString(),
      name: salon.name,
      slug: salon.slug,
      description: salon.description || undefined,
      rating: Number.isFinite(salon.rating) ? salon.rating : 0,
      reviewCount: Number.isFinite(salon.reviewCount) ? salon.reviewCount : 0,
      isDemoPreview: salon.isDemoPreview ?? false,
      imageUrl: salon.coverImage || salon.images?.[0] || salon.logo || null,
      area: salon.address?.area,
      city: salon.address?.city,
    }));
  },
  ['homepage-top-salons'],
  { revalidate: 300, tags: [HOME_SALON_CACHE_TAG] },
);

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-neutral-50 p-8 text-center">
      <p className="text-sm text-foreground-secondary">{message}</p>
    </div>
  );
}

function SalonCard({ salon }: {
  salon: {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    rating: number;
    reviewCount: number;
    isDemoPreview: boolean;
    imageUrl: string | null;
    area?: string;
    city?: string;
  };
}) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-bookmynai-lg">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-brand-pink/15 via-neutral-100 to-white">
        {salon.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={salon.imageUrl}
            alt={`${salon.name} salon`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-brand-pink/40" aria-hidden="true">
            <Scissors size={40} />
          </div>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-brand-black">{salon.name}</h3>
            {salon.isDemoPreview && <Badge variant="info" className="mt-1">Demo preview</Badge>}
            <p className="flex items-center gap-1 text-sm text-foreground-secondary">
              <MapPin size={13} className="text-brand-pink" />
              {salon.area || salon.city || 'BookMyNai'}
            </p>
          </div>
          {!salon.isDemoPreview && salon.rating > 0 ? (
            <div className="flex items-center gap-1 rounded-lg bg-neutral-50 px-2 py-1 text-sm font-semibold text-brand-black">
              <Star size={13} className="fill-yellow-400 text-yellow-400" />
              {salon.rating.toFixed(1)}
            </div>
          ) : null}
        </div>
        {!salon.isDemoPreview && salon.reviewCount > 0 ? (
          <p className="text-sm text-foreground-secondary">{salon.reviewCount} reviews</p>
        ) : null}
        {salon.description ? <p className="line-clamp-2 text-sm text-foreground-secondary">{salon.description}</p> : null}
        {salon.isDemoPreview && (
          <p className="text-xs text-info-700">
            Illustrative business, services, prices, and availability; not a real salon.
          </p>
        )}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          <Link href={`/salons/${salon.slug}`}>
            <Button variant="outline" size="sm" className="w-full">View Salon</Button>
          </Link>
          <Link href={`/salons/${salon.slug}?book=1`}>
            <Button variant="primary" size="sm" className="w-full">
              {salon.isDemoPreview ? 'Preview booking flow' : 'Book Now'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function HomeSalonFeed() {
  let salons: Array<{
    _id: string;
    name: string;
    slug: string;
    description?: string;
    rating: number;
    reviewCount: number;
    isDemoPreview: boolean;
    imageUrl: string | null;
    area?: string;
    city?: string;
  }> = [];
  let failed = false;

  try {
    salons = await getTopSalons();
  } catch (error) {
    console.error('Homepage top salon lookup failed:', error instanceof Error ? error.name : 'UnknownError');
    failed = true;
  }

  if (failed) return <EmptyState message="Salon listings are temporarily unavailable. Please visit all salons and try again shortly." />;
  if (!salons.length) return <EmptyState message="No approved salons are listed yet. Check back soon or browse all salons." />;
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {salons.map((salon) => <SalonCard key={salon._id} salon={salon} />)}
    </div>
  );
}
