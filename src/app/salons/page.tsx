'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Loading';
import LocationSearch from '@/components/location/LocationSearch';
import GoogleMap, { type MapSalon } from '@/components/location/GoogleMap';
import { MapPin, Star, Map } from 'lucide-react';
import { formatDistance } from '@/utils/distance';
import { SERVICE_CATEGORY_ARRAY } from '@/constants/services';
import {
  getSupportedLaunchCity,
  SUPPORTED_LAUNCH_CITIES,
} from '@/constants/launch-cities';
import ComingSoonLocation from '@/components/location/ComingSoonLocation';

interface Salon {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  images?: string[];
  address: {
    area?: string;
    city: string;
    state?: string;
  };
  location?: MapSalon['location'];
  rating: number;
  distance?: number;
  isVerified: boolean;
  reviewCount: number;
  isDemoPreview?: boolean;
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showMap, setShowMap] = useState(false);
  const [locationCenter, setLocationCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationRadius, setLocationRadius] = useState(5);
  const [useLocationSearch, setUseLocationSearch] = useState(false);
  const [unsupportedCity, setUnsupportedCity] = useState<string | null>(null);
  const requestId = useRef(0);

  // Fetch salons
  const fetchSalons = async (page: number = 1, lat?: number, lng?: number, radius?: number) => {
    const currentRequest = ++requestId.current;
    setLoadError(null);
    if (lat === undefined && city.trim() && !getSupportedLaunchCity(city)) {
      setUnsupportedCity(city.trim());
      setSalons([]);
      setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 });
      setUseLocationSearch(false);
      setLocationCenter(null);
      setLoading(false);
      return;
    }
    setUnsupportedCity(null);
    setLoading(true);
    try {
      let url = '/api/salons';
      let params: Record<string, string> = {
        page: String(page),
        limit: '20',
      };
      let nearbyBody: Record<string, string> | null = null;

      if (lat !== undefined && lng !== undefined && radius !== undefined) {
        url = '/api/salons/nearby';
        nearbyBody = {
          latitude: String(lat),
          longitude: String(lng),
          radius: String(radius),
          page: String(page),
          limit: '20',
          ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
          ...(city.trim() ? { city: city.trim() } : {}),
          ...(area.trim() ? { area: area.trim() } : {}),
          ...(serviceSearch.trim() ? { serviceSearch: serviceSearch.trim() } : {}),
          ...(serviceCategory ? { category: serviceCategory } : {}),
        };
        params = {};
        setLocationCenter({ latitude: lat, longitude: lng });
        setLocationRadius(radius);
        setUseLocationSearch(true);
      } else {
        // Use regular search
        setUseLocationSearch(false);
        setLocationCenter(null);
        if (searchTerm) params.search = searchTerm;
        if (serviceSearch.trim()) params.serviceSearch = serviceSearch.trim();
        if (serviceCategory) params.category = serviceCategory;
        if (city) params.city = city;
        if (area) params.area = area;
        if (sortBy) params.sortBy = sortBy;
      }

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        nearbyBody ? url : `${url}?${queryString}`,
        nearbyBody
          ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(nearbyBody),
            }
          : { method: 'GET' },
      );

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || result.error || 'Unable to load salons. Please try again.');
      }
      const nextSalons = Array.isArray(result.data) ? result.data : result.data?.salons;
      const nextPagination = result.pagination || result.data?.pagination;
      if (!Array.isArray(nextSalons) || !nextPagination) {
        throw new Error('The salon listing response was incomplete. Please try again.');
      }
      if (currentRequest !== requestId.current) return;
      setSalons(nextSalons);
      setPagination(nextPagination);
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      console.error('Salon discovery request failed:', error instanceof Error ? error.name : 'UnknownError');
      setSalons([]);
      setLoadError(error instanceof Error ? error.message : 'Unable to load salons. Please try again.');
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const requestedCity = new URLSearchParams(window.location.search).get('city')?.trim();
      const requestedParams = new URLSearchParams(window.location.search);
      setSearchTerm((requestedParams.get('search') || '').slice(0, 100));
      setServiceSearch((requestedParams.get('serviceSearch') || requestedParams.get('service') || '').slice(0, 80));
      const requestedCategory = requestedParams.get('category') || '';
      if (SERVICE_CATEGORY_ARRAY.includes(requestedCategory as (typeof SERVICE_CATEGORY_ARRAY)[number])) {
        setServiceCategory(requestedCategory);
      }
      setArea((requestedParams.get('area') || '').slice(0, 80));
      if (requestedCity && !getSupportedLaunchCity(requestedCity)) {
        setCity(requestedCity.slice(0, 60));
        setUnsupportedCity(requestedCity.slice(0, 60));
      } else if (requestedCity) {
        setCity(getSupportedLaunchCity(requestedCity)?.city || '');
      }
      setFiltersInitialized(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!filtersInitialized) return;
    const timeoutId = window.setTimeout(() => {
    if (useLocationSearch && locationCenter) {
      void fetchSalons(1, locationCenter.latitude, locationCenter.longitude, locationRadius);
    } else {
      void fetchSalons(1);
    }
    }, 0);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersInitialized, searchTerm, serviceSearch, serviceCategory, city, area, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (useLocationSearch && locationCenter) {
      fetchSalons(1, locationCenter.latitude, locationCenter.longitude, locationRadius);
    } else {
      fetchSalons(1);
    }
  };

  const handleCityAreaSearch = (cityValue: string, areaValue: string) => {
    setCity(cityValue);
    setArea(areaValue);
    setUseLocationSearch(false);
    setLocationCenter(null);
  };

  const handleLocationSearch = (latitude: number, longitude: number, radius: number) => {
    void fetchSalons(1, latitude, longitude, radius);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-pink/10 to-transparent py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-4">Discover Salons</h1>
          <p className="text-foreground-secondary text-lg">
            Browse approved salons by name and location, and sort by their listed ratings
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Location Search Section */}
        <div className="mb-8">
          <LocationSearch onSearch={handleLocationSearch} onCityAreaSearch={handleCityAreaSearch} loading={loading} />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            type="search"
            aria-label="Search active salon services"
            placeholder="Search services, e.g. haircut or beard trim"
            value={serviceSearch}
            maxLength={80}
            onChange={(event) => setServiceSearch(event.target.value)}
          />
          <label className="sr-only" htmlFor="service-category-filter">Filter by service category</label>
          <select
            id="service-category-filter"
            aria-label="Filter by service category"
            value={serviceCategory}
            onChange={(event) => setServiceCategory(event.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-border bg-white px-4 py-2 text-foreground hover:border-brand-pink transition-colors"
          >
            <option value="">All service categories</option>
            {SERVICE_CATEGORY_ARRAY.map((category) => (
              <option key={category} value={category}>
                {category.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {unsupportedCity && (
          <div className="mb-8">
            <ComingSoonLocation
              city={unsupportedCity}
              onChooseCity={(nextCity) => {
                setCity(nextCity);
                setArea('');
                setUnsupportedCity(null);
                window.history.replaceState(null, '', `/salons?city=${encodeURIComponent(nextCity)}`);
              }}
            />
          </div>
        )}

        {/* Location-based Discovery Results */}
        {useLocationSearch && locationCenter && (
          <div className="mb-8">
            {/* Map View */}
            {showMap && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-foreground">Nearby Salons Map</h2>
                  <Button variant="ghost" onClick={() => setShowMap(false)}>
                    Hide Map
                  </Button>
                </div>
                <GoogleMap
                  salons={salons.filter((salon): salon is Salon & MapSalon => Boolean(salon.location))}
                  center={locationCenter}
                  height="500px"
                />
              </div>
            )}

            {!showMap && salons.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowMap(true)}
                className="mb-6"
              >
                <Map size={18} className="mr-2" />
                View on Map
              </Button>
            )}
          </div>
        )}
        {/* Traditional Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            {/* Search */}
            <div className="md:col-span-2">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  aria-label="Search salons by name, description, or area"
                  placeholder="Search salons..."
                  value={searchTerm}
                  maxLength={100}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </form>
            </div>

            {/* City Filter */}
            <div>
              <select
                aria-label="Filter salons by city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 border border-border rounded-lg bg-white text-foreground hover:border-brand-pink transition-colors"
              >
                <option value="">All cities</option>
                {SUPPORTED_LAUNCH_CITIES.map(({ city: cityName, state }) => (
                  <option key={cityName} value={cityName}>{cityName}, {state}</option>
                ))}
              </select>
            </div>

            {/* Area / locality filter */}
            <div>
              <Input
                type="text"
                placeholder="Area / locality"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                maxLength={80}
                disabled={loading}
                aria-label="Filter salons by area or locality"
              />
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort salons"
                disabled={loading}
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
          <div role="status" className="flex justify-center py-12">
            <Spinner size="lg" />
            <span className="sr-only">Loading salons…</span>
          </div>
        ) : loadError ? (
          <Card role="alert" className="p-8 text-center">
            <p className="mb-4 text-error-600">{loadError}</p>
            <Button
              variant="outline"
              onClick={() => {
                if (useLocationSearch && locationCenter) {
                  void fetchSalons(1, locationCenter.latitude, locationCenter.longitude, locationRadius);
                } else {
                  void fetchSalons(1);
                }
              }}
            >
              Try again
            </Button>
          </Card>
        ) : unsupportedCity ? null : salons.length === 0 ? (
          <Card role="status" className="bg-gradient-to-r from-gray-50 to-white p-12 text-center">
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
                    <div className="h-48 bg-gray-100 overflow-hidden rounded-t-lg">
                      {/* Salon image hosts are managed by salons, so avoid a static remote-host allow-list. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={salon.coverImage || salon.images?.[0] || salon.logo || '/salon-placeholder.svg'}
                        alt={`${salon.name} salon`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/salon-placeholder.svg';
                        }}
                      />
                    </div>

                    <div className="p-4">
                      {/* Name and Verified */}
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-foreground line-clamp-2">
                          {salon.name}
                        </h3>
                        {salon.isDemoPreview ? (
                          <Badge variant="info" className="ml-2 flex-shrink-0">
                            Demo preview
                          </Badge>
                        ) : salon.isVerified && (
                          <Badge variant="success" className="ml-2 flex-shrink-0">
                            Verified
                          </Badge>
                        )}
                      </div>

                      {/* Rating / reviews shown only when the model already has real ratings and review counts */}
                      {!salon.isDemoPreview && salon.rating > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center text-yellow-500">
                            <Star size={16} fill="currentColor" />
                            <span className="ml-1 font-semibold">{salon.rating}</span>
                          </div>
                          {salon.reviewCount > 0 && (
                            <span className="text-sm text-foreground-secondary">
                              ({salon.reviewCount} reviews)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Description */}
                      {salon.description && (
                        <p className="text-sm text-foreground-secondary mb-3 line-clamp-2">
                          {salon.description}
                        </p>
                      )}

                      {/* Location */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-foreground-secondary">
                          <MapPin size={16} />
                          <span>
                            {salon.address.area ? `${salon.address.area}, ` : ''}
                            {salon.address.city || 'City unavailable'}
                          </span>
                        </div>
                        {useLocationSearch && salon.distance && (
                          <div className="font-medium text-brand-pink text-right">
                            {formatDistance(salon.distance)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="space-y-3">
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (useLocationSearch && locationCenter) {
                      fetchSalons(
                        Math.max(1, pagination.page - 1),
                        locationCenter.latitude,
                        locationCenter.longitude,
                        locationRadius
                      );
                    } else {
                      fetchSalons(Math.max(1, pagination.page - 1));
                    }
                  }}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>

                <div className="flex gap-1">
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, index) => Math.max(
                      1,
                      Math.min(pagination.page - 2, pagination.totalPages - 4),
                    ) + index,
                  ).map((page) => (
                    <button
                      key={page}
                      onClick={() => {
                        if (useLocationSearch && locationCenter) {
                          fetchSalons(page, locationCenter.latitude, locationCenter.longitude, locationRadius);
                        } else {
                          fetchSalons(page);
                        }
                      }}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        pagination.page === page
                          ? 'bg-brand-pink text-white'
                          : 'text-foreground hover:bg-gray-100'
                      }`}
                      aria-label={`Page ${page}`}
                      aria-current={pagination.page === page ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  onClick={() => {
                    if (useLocationSearch && locationCenter) {
                      fetchSalons(
                        Math.min(pagination.totalPages, pagination.page + 1),
                        locationCenter.latitude,
                        locationCenter.longitude,
                        locationRadius
                      );
                    } else {
                      fetchSalons(Math.min(pagination.totalPages, pagination.page + 1));
                    }
                  }}
                  disabled={pagination.page === pagination.totalPages || pagination.page >= 1000}
                >
                  Next
                </Button>
              </div>
              <p className="mt-3 text-center text-sm text-foreground-secondary">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} salons
                {pagination.totalPages > 1000 ? ' (first 1,000 pages available)' : ''}
              </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
