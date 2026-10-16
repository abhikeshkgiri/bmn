import { unstable_cache } from 'next/cache';
import { listSalons } from '@/services/salon.service';
import { HOME_SALON_CACHE_TAG } from '@/lib/home-salon-cache';
import { type SalonType } from '@/constants/services';
import HomeSalonCard, { type HomeSalonCardData } from '@/components/home/HomeSalonCard';

const getTopSalons = unstable_cache(
  async (salonTypes: SalonType[]) => {
    const result = await listSalons({ limit: 3, sortBy: 'rating', isActive: true, salonTypes });
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

export default async function HomeSalonFeed({ salonTypes }: { salonTypes: SalonType[] }) {
  let salons: HomeSalonCardData[] = [];
  let failed = false;

  try {
    salons = await getTopSalons(salonTypes);
  } catch (error) {
    console.error('Homepage top salon lookup failed:', error instanceof Error ? error.name : 'UnknownError');
    failed = true;
  }

  if (failed) return <EmptyState message="Salon listings are temporarily unavailable. Please visit all salons and try again shortly." />;
  if (!salons.length) return <EmptyState message="No approved salons are listed yet. Check back soon or browse all salons." />;
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {salons.map((salon) => <HomeSalonCard key={salon._id} salon={salon} />)}
    </div>
  );
}
