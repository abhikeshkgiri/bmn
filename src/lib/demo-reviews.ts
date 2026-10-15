export interface DemoReview {
  customer: string;
  review: string;
  salon: string;
  city: string;
  badge: string;
}

export const DEMO_REVIEWS: DemoReview[] = [
  {
    customer: 'Sample preview',
    review: 'Illustrative placeholder copy only. No customer review has been submitted.',
    salon: 'Demo listing',
    city: 'Delhi',
    badge: 'Preview only',
  },
  {
    customer: 'Sample preview',
    review: 'Illustrative placeholder copy only. No customer review has been submitted.',
    salon: 'Demo listing',
    city: 'Delhi',
    badge: 'Preview only',
  },
  {
    customer: 'Sample preview',
    review: 'Illustrative placeholder copy only. No customer review has been submitted.',
    salon: 'Demo listing',
    city: 'Delhi',
    badge: 'Preview only',
  },
  {
    customer: 'Sample preview',
    review: 'Illustrative placeholder copy only. No customer review has been submitted.',
    salon: 'Demo listing',
    city: 'Mumbai',
    badge: 'Preview only',
  },
];

export function getDemoReviews(city = 'Delhi'): DemoReview[] {
  const normalized = (city || 'Delhi').trim().toLowerCase();
  if (!normalized || normalized === 'delhi') {
    return DEMO_REVIEWS.filter((review) => review.city === 'Delhi');
  }
  if (normalized === 'mumbai') {
    return DEMO_REVIEWS.filter((review) => review.city === 'Mumbai');
  }
  return DEMO_REVIEWS.filter((review) => review.city === city || review.city === 'Delhi');
}
