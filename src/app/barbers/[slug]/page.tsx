import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Star, MapPin, Clock } from 'lucide-react';

interface Service {
  _id: string;
  name: string;
  duration: number;
  price: number;
}

interface PortfolioItem {
  image: string;
  title?: string;
  description?: string;
}

interface Barber {
  _id: string;
  name: string;
  slug: string;
  profileImage?: string;
  bio?: string;
  experienceYears: number;
  specializations: string[];
  services?: Service[];
  portfolio?: PortfolioItem[];
  rating: number;
  reviewCount: number;
  offersHomeService: boolean;
  homeServiceRadius?: number;
  isActive: boolean;
  salon?: {
    _id: string;
    name: string;
    slug: string;
  };
}

const SPECIALIZATION_LABELS: Record<string, string> = {
  HAIRCUT: 'Haircut',
  BEARD: 'Beard',
  HAIR_STYLING: 'Hair Styling',
  HAIR_COLOR: 'Hair Color',
  FACIAL: 'Facial',
  GROOMING: 'Grooming',
  KIDS_HAIRCUT: 'Kids',
  BRIDAL: 'Bridal',
  OTHER: 'Other',
};

async function getBarber(slug: string): Promise<Barber | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/barbers?search=${slug}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    if (result.success && result.data.length > 0) {
      return result.data.find((b: Barber) => b.slug === slug) || null;
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch barber:', error);
    return null;
  }
}

export default async function BarberDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const barber = await getBarber(slug);

  if (!barber || !barber.isActive) {
    redirect('/barbers');
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Profile Section */}
            <Card className="overflow-hidden">
              {/* Profile Image */}
              {barber.profileImage && (
                <div className="h-96 bg-gray-200 overflow-hidden">
                  <img
                    src={barber.profileImage}
                    alt={barber.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Profile Info */}
              <div className="p-8">
                <div className="mb-6">
                  <h1 className="text-4xl font-bold text-foreground mb-2">{barber.name}</h1>
                  <p className="text-lg text-foreground-secondary">Professional Barber</p>
                </div>

                {/* Rating & Experience */}
                <div className="flex flex-col md:flex-row gap-6 mb-6 pb-6 border-b border-border">
                  {barber.rating > 0 && (
                    <div className="flex items-center gap-3">
                      <Star size={20} className="fill-brand-pink text-brand-pink" />
                      <div>
                        <p className="font-bold text-lg text-foreground">{barber.rating.toFixed(1)}</p>
                        <p className="text-sm text-foreground-secondary">
                          {barber.reviewCount} reviews
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-foreground" />
                    <div>
                      <p className="font-bold text-lg text-foreground">
                        {barber.experienceYears}
                      </p>
                      <p className="text-sm text-foreground-secondary">
                        {barber.experienceYears === 1 ? 'Year' : 'Years'} Experience
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {barber.bio && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-foreground mb-2">About</h2>
                    <p className="text-foreground-secondary">{barber.bio}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Specializations */}
            {barber.specializations.length > 0 && (
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Specializations</h2>
                <div className="flex flex-wrap gap-2">
                  {barber.specializations.map((spec) => (
                    <Badge key={spec} variant="info">
                      {SPECIALIZATION_LABELS[spec] || spec}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Services */}
            {barber.services && barber.services.length > 0 && (
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Services</h2>
                <div className="space-y-3">
                  {barber.services.slice(0, 5).map((service: Service) => (
                    <div
                      key={service._id}
                      className="flex justify-between items-center p-3 bg-background rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-foreground">{service.name}</p>
                        <p className="text-sm text-foreground-secondary">
                          {service.duration} min
                        </p>
                      </div>
                      <p className="font-bold text-foreground">
                        ₹{Math.round(service.price / 100)}
                      </p>
                    </div>
                  ))}
                  {barber.services.length > 5 && (
                    <p className="text-sm text-foreground-secondary pt-2">
                      +{barber.services.length - 5} more services
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Portfolio */}
            {barber.portfolio && barber.portfolio.length > 0 && (
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Portfolio</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {barber.portfolio.map((item: PortfolioItem, index: number) => (
                    <div key={index} className="overflow-hidden rounded-lg bg-gray-200">
                      <img
                        src={item.image}
                        alt={item.title || `Portfolio item ${index + 1}`}
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Salon Info */}
            {barber.salon && (
              <Card className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Working At</h3>
                <div className="space-y-3">
                  <p className="font-medium text-foreground">{barber.salon.name}</p>
                  <Link href={`/salons/${barber.salon.slug}`}>
                    <Button variant="primary" fullWidth>
                      View Salon
                    </Button>
                  </Link>
                </div>
              </Card>
            )}

            {/* Home Service */}
            {barber.offersHomeService && (
              <Card className="p-6 border-2 border-brand-pink">
                <h3 className="text-lg font-bold text-foreground mb-2">Home Service</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-brand-pink" />
                    <span className="text-foreground-secondary">
                      Available within {barber.homeServiceRadius || 'N/A'} km
                    </span>
                  </div>
                  <p className="text-sm text-foreground-secondary">
                    Book barber services at your location
                  </p>
                </div>
              </Card>
            )}

            {/* Booking Placeholder */}
            <Card className="p-6 bg-background border-2 border-brand-pink">
              <Button variant="primary" fullWidth>
                Book Appointment
              </Button>
              <p className="text-xs text-foreground-secondary text-center mt-2">
                Coming soon
              </p>
            </Card>

            {/* Back to Barbers */}
            <Link href="/barbers">
              <Button variant="ghost" fullWidth>
                ← Back to Barbers
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
