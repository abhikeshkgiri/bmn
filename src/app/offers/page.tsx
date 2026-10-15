'use client';

import Link from 'next/link';
import { ArrowLeft, Info, Tag } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { getDemoOffers } from '@/lib/demo-offers';

export default function OffersPage() {
  const offers = getDemoOffers('Delhi');

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-pink">Save more</p>
            <h1 className="mt-2 text-4xl font-bold text-brand-black">Offers & Coupons</h1>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back home
            </Button>
          </Link>
        </div>

        <p className="mb-6 rounded-xl border border-info-200 bg-info-50 p-4 text-sm text-info-700">
          These sample coupons are for preview only and cannot be redeemed at checkout.
        </p>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => (
            <Card key={offer.code} className="h-full overflow-hidden">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center rounded-full bg-brand-pink/10 px-2.5 py-1 text-xs font-semibold text-brand-pink">
                    <Tag size={12} className="mr-1" />
                    {offer.badge}
                  </span>
                  <span className="text-sm font-semibold text-brand-black">{offer.code}</span>
                </div>

                <h2 className="text-xl font-bold text-brand-black">{offer.title}</h2>
                <p className="mt-3 text-sm text-foreground-secondary">{offer.description}</p>

                <div className="mt-5 rounded-xl border border-brand-pink/20 bg-brand-pink/5 p-3">
                  <p className="text-xs uppercase tracking-wide text-foreground-secondary">Sample discount</p>
                  <p className="mt-1 text-2xl font-bold text-brand-pink">{offer.discountText}</p>
                </div>

                <div className="mt-5 flex items-center justify-between text-sm text-foreground-secondary">
                  <span>Valid until</span>
                  <span className="font-medium text-brand-black">{offer.validUntil}</span>
                </div>

                <div className="mt-5 flex items-center gap-2 text-sm text-foreground-secondary">
                  <Info size={16} />
                  Demo display only · not redeemable
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
