export interface DemoOffer {
  code: string;
  title: string;
  description: string;
  city: string;
  validUntil: string;
  badge: string;
  discountText: string;
}

export const DEMO_OFFERS: DemoOffer[] = [
  {
    code: 'WELCOME50',
    title: 'Welcome offer',
    description: '₹50 off on your first booking at participating salons.',
    city: 'Delhi',
    validUntil: '31 Dec 2026',
    badge: 'First booking',
    discountText: '₹50 OFF',
  },
  {
    code: 'BOOKMYNAI20',
    title: 'Weekend styling',
    description: '20% off up to ₹100 on premium grooming packages.',
    city: 'Delhi',
    validUntil: '15 Sep 2026',
    badge: 'Popular',
    discountText: '20% OFF',
  },
  {
    code: 'DELHI100',
    title: 'Delhi city offer',
    description: '₹100 off selected Delhi salons for premium haircuts and beard sessions.',
    city: 'Delhi',
    validUntil: '30 Sep 2026',
    badge: 'Delhi',
    discountText: '₹100 OFF',
  },
  {
    code: 'FIRSTBOOK',
    title: 'New customer perk',
    description: '10% off your first booking at salon partners across the city.',
    city: 'Mumbai',
    validUntil: '30 Nov 2026',
    badge: 'Mumbai',
    discountText: '10% OFF',
  },
];

export function getDemoOffers(city = 'Delhi'): DemoOffer[] {
  const normalized = (city || 'Delhi').trim().toLowerCase();

  if (!normalized || normalized === 'delhi') {
    return DEMO_OFFERS.filter((offer) => offer.city === 'Delhi');
  }

  if (normalized === 'mumbai') {
    return DEMO_OFFERS.filter((offer) => offer.city === 'Mumbai');
  }

  return DEMO_OFFERS.filter((offer) => offer.city === city || offer.city === 'Delhi');
}
