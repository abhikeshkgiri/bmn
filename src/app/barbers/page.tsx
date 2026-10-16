'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import { BARBER_SPECIALIZATION } from '@/constants/services';
import { Star } from 'lucide-react';

interface Barber {
  _id: string;
  name: string;
  slug: string;
  profileImage?: string;
  bio?: string;
  experienceYears: number;
  specializations: string[];
  rating: number;
  reviewCount: number;
  isDemoPreview?: boolean;
  offersHomeService: boolean;
  isActive: boolean;
  salon?: {
    _id: string;
    name: string;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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

export default function BarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [homeServiceOnly, setHomeServiceOnly] = useState(false);

  const fetchBarbers = async (page: number = 1) => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      query.append('page', page.toString());
      query.append('limit', '12');
      if (searchTerm) query.append('search', searchTerm);
      if (selectedSpecialization) query.append('specialization', selectedSpecialization);
      if (homeServiceOnly) query.append('offersHomeService', 'true');

      const response = await fetch(`/api/barbers?${query}`);
      const result = await response.json();

      if (result.success) {
        setBarbers(result.data);
        setPagination(result.pagination);
      }
    } catch {
      console.error('Failed to fetch barbers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadBarbers = async () => {
      await fetchBarbers(1);
    };
    loadBarbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedSpecialization, homeServiceOnly]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBarbers(1);
  };

  if (loading && barbers.length === 0) {
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
          <h1 className="text-4xl font-bold text-foreground mb-2">Professional Barbers</h1>
          <p className="text-foreground-secondary">Find experienced barbers near you</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-background rounded-lg p-6 mb-12 space-y-4">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <Input
                  placeholder="Search barbers by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <select
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg bg-white text-foreground font-medium hover:bg-gray-50"
              >
                <option value="">All Specializations</option>
                {Object.entries(BARBER_SPECIALIZATION).map(([key, value]) => (
                  <option key={key} value={value}>
                    {SPECIALIZATION_LABELS[value] || value}
                  </option>
                ))}
              </select>
              <Button variant="primary" type="submit">
                Search
              </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={homeServiceOnly}
                  onChange={(e) => setHomeServiceOnly(e.target.checked)}
                  className="w-4 h-4 accent-brand-pink"
                />
                <span className="text-sm text-foreground">Home Service Available</span>
              </label>
            </div>
          </form>
        </div>

        {/* Barbers Grid */}
        {barbers.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {barbers.map((barber) => (
                <Link key={barber._id} href={`/barbers/${barber.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    {/* Profile Image */}
                    {barber.profileImage && (
                      <div className="h-48 bg-gray-200 overflow-hidden rounded-t-lg">
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

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      {/* Name & Experience */}
                      <div>
                        <h3 className="font-bold text-lg text-foreground mb-1">{barber.name}</h3>
                        <p className="text-sm text-foreground-secondary">
                          {barber.experienceYears} years experience
                        </p>
                      </div>

                      {/* Rating */}
                      {barber.isDemoPreview ? (
                        <Badge variant="info">Demo preview</Badge>
                      ) : barber.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star size={16} className="fill-brand-pink text-brand-pink" />
                          <span className="text-sm font-medium text-foreground">
                            {barber.rating.toFixed(1)}
                          </span>
                          <span className="text-sm text-foreground-secondary">
                            ({barber.reviewCount} reviews)
                          </span>
                        </div>
                      )}

                      {/* Specializations */}
                      {barber.specializations.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {barber.specializations.slice(0, 3).map((spec) => (
                            <Badge key={spec} variant="info" className="text-xs">
                              {SPECIALIZATION_LABELS[spec] || spec}
                            </Badge>
                          ))}
                          {barber.specializations.length > 3 && (
                            <Badge variant="info" className="text-xs">
                              +{barber.specializations.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Bio */}
                      {barber.bio && (
                        <p className="text-sm text-foreground-secondary line-clamp-2">
                          {barber.bio}
                        </p>
                      )}

                      {/* Home Service */}
                      {barber.offersHomeService && (
                        <Badge variant="success" className="text-xs">
                          Home Service Available
                        </Badge>
                      )}

                      {/* View Profile Button */}
                      <Button variant="primary" fullWidth className="mt-4">
                        View Profile
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
                  onClick={() => fetchBarbers(pagination.page - 1)}
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
                      onClick={() => fetchBarbers(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button
                  variant="ghost"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => fetchBarbers(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-foreground-secondary mb-4">No barbers found</p>
            <Button variant="primary" onClick={() => setSearchTerm('')}>
              Clear Filters
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
