export interface DemoReview {
  customer: string;
  rating: number;
  review: string;
  salon: string;
  city: string;
  badge: string;
}

export const DEMO_REVIEWS: DemoReview[] = [
  {
    customer: 'Amit',
    rating: 5,
    review: 'Very smooth booking experience and the barber was on time.',
    salon: 'Delhi Grooming Studio',
    city: 'Delhi',
    badge: 'Verified Booking',
  },
  {
    customer: 'Priya',
    rating: 5,
    review: 'Easy to find available slots and book an appointment without hassle.',
    salon: 'Rohini Hair & Beauty',
    city: 'Delhi',
    badge: 'Demo review',
  },
  {
    customer: 'Rahul',
    rating: 4,
    review: 'Good service and a simple booking process. The slot selection was easy.',
    salon: 'Connaught Place Salon',
    city: 'Delhi',
    badge: 'Demo review',
  },
  {
    customer: 'Neha',
    rating: 5,
    review: 'The salon experience was polished and the booking flow worked perfectly.',
    salon: 'Urban Trim Studio',
    city: 'Mumbai',
    badge: 'Verified Booking',
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
