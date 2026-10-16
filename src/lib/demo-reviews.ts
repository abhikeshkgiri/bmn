export interface DemoReview {
  id: string;
  customer: string;
  review: string;
  salon: string;
  city: string;
  badge: string;
}

export const DEMO_REVIEWS: DemoReview[] = [
  {
    id: 'delhi-preview-1',
    customer: 'Sample preview',
    review: 'Illustrative placeholder copy only. No customer review has been submitted.',
    salon: 'Demo listing',
    city: 'Delhi',
    badge: 'Preview only',
  },
  {
    id: 'delhi-preview-2',
    customer: 'Sample preview',
    review: 'Illustrative placeholder copy only. No customer review has been submitted.',
    salon: 'Demo listing',
    city: 'Delhi',
    badge: 'Preview only',
  },
  {
    id: 'delhi-preview-3',
    customer: 'Sample preview',
    review: 'Illustrative placeholder copy only. No customer review has been submitted.',
    salon: 'Demo listing',
    city: 'Delhi',
    badge: 'Preview only',
  },
  {
    id: 'mumbai-preview-1',
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
