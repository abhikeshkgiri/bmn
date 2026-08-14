'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import { formatCurrency } from '@/utils/currency';
import { SERVICE_CATEGORY } from '@/constants/services';
import { Clock } from 'lucide-react';

interface Service {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  image?: string;
  duration: number;
  price: number;
  discountPrice?: number;
  isActive: boolean;
  salon: {
    _id: string;
    name: string;
    slug: string;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  HAIRCUT: 'Haircut',
  BEARD: 'Beard',
  HAIR_STYLING: 'Hair Styling',
  HAIR_COLOR: 'Hair Color',
  FACIAL: 'Facial',
  GROOMING: 'Grooming',
  KIDS: 'Kids',
  OTHER: 'Other',
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const fetchServices = async (page: number = 1) => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      query.append('page', page.toString());
      query.append('limit', '12');
      if (searchTerm) query.append('search', searchTerm);
      if (selectedCategory) query.append('category', selectedCategory);

      const response = await fetch(`/api/services?${query}`);
      const result = await response.json();

      if (result.success) {
        setServices(result.data);
        setPagination(result.pagination);
      }
    } catch {
      console.error('Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadServices = async () => {
      await fetchServices(1);
    };
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchServices(1);
  };

  if (loading && services.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Salon Services</h1>
          <p className="text-foreground-secondary">Discover and book services from your favorite salons</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-background rounded-lg p-6 mb-12 space-y-4">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <Input
                  placeholder="Search services (haircut, color, etc.)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg bg-white text-foreground font-medium hover:bg-gray-50"
              >
                <option value="">All Categories</option>
                {Object.entries(SERVICE_CATEGORY).map(([key, value]) => (
                  <option key={key} value={value}>
                    {CATEGORY_LABELS[value]}
                  </option>
                ))}
              </select>
              <Button variant="primary" type="submit">
                Search
              </Button>
            </div>
          </form>
        </div>

        {/* Services Grid */}
        {services.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {services.map((service) => (
                <Link key={service._id} href={`/salons/${service.salon.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    {/* Service Image */}
                    {service.image && (
                      <div className="h-48 bg-gray-200 overflow-hidden rounded-t-lg">
                        <img
                          src={service.image}
                          alt={service.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      {/* Service Name */}
                      <div>
                        <h3 className="font-bold text-lg text-foreground mb-1">{service.name}</h3>
                        <p className="text-sm text-foreground-secondary">{service.salon.name}</p>
                      </div>

                      {/* Category Badge */}
                      <Badge variant="info">{CATEGORY_LABELS[service.category]}</Badge>

                      {/* Description */}
                      {service.description && (
                        <p className="text-sm text-foreground-secondary line-clamp-2">
                          {service.description}
                        </p>
                      )}

                      {/* Duration & Price */}
                      <div className="space-y-2 pt-2 border-t border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-foreground-secondary">
                            <Clock size={16} />
                            <span className="text-sm">{service.duration} min</span>
                          </div>
                          <div className="text-right">
                            {service.discountPrice ? (
                              <div>
                                <div className="text-sm line-through text-foreground-secondary">
                                  {formatCurrency(service.price)}
                                </div>
                                <div className="font-bold text-brand-pink">
                                  {formatCurrency(service.discountPrice)}
                                </div>
                              </div>
                            ) : (
                              <div className="font-bold text-foreground">{formatCurrency(service.price)}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Book Button */}
                      <Button variant="primary" fullWidth className="mt-4">
                        View Salon
                      </Button>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant="ghost"
                  disabled={pagination.page === 1}
                  onClick={() => fetchServices(pagination.page - 1)}
                >
                  Previous
                </Button>

                {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                  const pageNum = pagination.page > 3 ? pagination.page - 2 + i : i + 1;
                  if (pageNum > pagination.totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === pagination.page ? 'primary' : 'ghost'}
                      onClick={() => fetchServices(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button
                  variant="ghost"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => fetchServices(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-foreground-secondary mb-4">No services found</p>
            <Button variant="primary" onClick={() => setSearchTerm('')}>
              Clear Filters
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
