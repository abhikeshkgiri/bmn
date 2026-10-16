import { MapPin, Scissors, Star } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { formatDistance } from '@/utils/distance';

export interface HomeSalonCardData {
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
  distance?: number;
}

export default function HomeSalonCard({ salon }: { salon: HomeSalonCardData }) {
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
        {salon.distance !== undefined && (
          <p className="text-sm font-medium text-brand-pink">{formatDistance(salon.distance)} away</p>
        )}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          <ButtonLink href={`/salons/${salon.slug}`} variant="outline" size="sm" className="w-full">View Salon</ButtonLink>
          <ButtonLink href={`/salons/${salon.slug}?book=1`} variant="primary" size="sm" className="w-full">
              {salon.isDemoPreview ? 'Preview booking flow' : 'Book Now'}
          </ButtonLink>
        </div>
      </CardContent>
    </Card>
  );
}
