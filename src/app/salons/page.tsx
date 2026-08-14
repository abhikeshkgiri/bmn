'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Loading';
import { MapPin, Star } from 'lucide-react';

interface Salon {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  address: {
    city: string;
    area?: string;
  };
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SalonsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [city, setCity] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Fetch salons
  const fetchSalons = async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (city) params.append('city', city);
      if (sortBy) params.append('sortBy', sortBy);

      const response = await fetch(`/api/salons?${params}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (data.success) {
        setSalons(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch salons:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadSalons = async () => {
      await fetchSalons(1);
    };
    loadSalons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, city, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSalons(1);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-pink/10 to-transparent py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-4">Discover Salons</h1>
          <p className="text-foreground-secondary text-lg">
            Find and book appointments at top-rated salons near you
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Search */}
          <div className="md:col-span-2">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                placeholder="Search salons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>
          </div>

          {/* City Filter */}
          <div>
            <Input
              type="text"
              placeholder="City (e.g., Delhi)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-white text-foreground hover:border-brand-pink transition-colors"
            >
              <option value="newest">Newest</option>
              <option value="rating">Highest Rated</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : salons.length === 0 ? (
          <Card className="bg-gradient-to-r from-gray-50 to-white p-12 text-center">
            <p className="text-lg text-foreground-secondary mb-4">No salons found</p>
            <p className="text-foreground-secondary">Try adjusting your search or filters</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {salons.map((salon) => (
                <Link key={salon._id} href={`/salons/${salon.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    {/* Salon Image */}
                    {salon.logo && (
                      <div className="h-48 bg-gray-100 overflow-hidden rounded-t-lg">
                        <img
                          src={salon.logo}
                          alt={salon.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="p-4">
                      {/* Name and Verified */}
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-foreground line-clamp-2">
                          {salon.name}
                        </h3>
                        {salon.isVerified && (
                          <Badge variant="success" className="ml-2 flex-shrink-0">
                            Verified
                          </Badge>
                        )}
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center text-yellow-500">
                          <Star size={16} fill="currentColor" />
                          <span className="ml-1 font-semibold">{salon.rating}</span>
                        </div>
                        <span className="text-sm text-foreground-secondary">
                          ({salon.reviewCount} reviews)
                        </span>
                      </div>

                      {/* Description */}
                      {salon.description && (
                        <p className="text-sm text-foreground-secondary mb-3 line-clamp-2">
                          {salon.description}
                        </p>
                      )}

                      {/* Location */}
                      <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                        <MapPin size={16} />
                        <span>
                          {salon.address.area && `${salon.address.area}, `}
                          {salon.address.city}
                        </span>
                      </div>
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
                  onClick={() => fetchSalons(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>

                <div className="flex gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => fetchSalons(page)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        pagination.page === page
                          ? 'bg-brand-pink text-white'
                          : 'text-foreground hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  onClick={() => fetchSalons(Math.min(pagination.totalPages, pagination.page + 1))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
