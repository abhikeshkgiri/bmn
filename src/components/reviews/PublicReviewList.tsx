'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface PublicReview {
  _id: string;
  rating: number;
  review?: string;
  createdAt: string;
  customer?: { name?: string; avatar?: string };
}

interface ReviewResponse {
  reviews: PublicReview[];
  pagination: { page: number; totalPages: number; total: number };
  stats: { averageRating: number; totalReviews: number };
}

interface PublicReviewListProps {
  endpoint: string;
  title: string;
}

function isReviewResponse(value: unknown): value is { success: true; data: ReviewResponse } {
  if (typeof value !== 'object' || value === null || !('success' in value) || value.success !== true ||
    !('data' in value) || typeof value.data !== 'object' || value.data === null) {
    return false;
  }
  const data = value.data;
  return 'reviews' in data && Array.isArray(data.reviews) &&
    'pagination' in data && typeof data.pagination === 'object' && data.pagination !== null &&
    'page' in data.pagination && typeof data.pagination.page === 'number' &&
    'totalPages' in data.pagination && typeof data.pagination.totalPages === 'number' &&
    'total' in data.pagination && typeof data.pagination.total === 'number' &&
    'stats' in data && typeof data.stats === 'object' && data.stats !== null &&
    'averageRating' in data.stats && typeof data.stats.averageRating === 'number' &&
    'totalReviews' in data.stats && typeof data.stats.totalReviews === 'number';
}

export function PublicReviewList({ endpoint, title }: PublicReviewListProps) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const fetchReviews = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetch(`${endpoint}?page=${page}&limit=10`, { signal });
      const body: unknown = await response.json();
      if (!response.ok || !isReviewResponse(body)) {
        throw new Error('Unable to load reviews');
      }
      setResult(body.data as ReviewResponse);
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return;
      setError(true);
      setResult(null);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [endpoint, page]);

  useEffect(() => {
    const controller = new AbortController();
    // The request synchronizes this component with the public reviews endpoint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchReviews(controller.signal);
    return () => controller.abort();
  }, [fetchReviews, retryKey]);

  return (
    <Card className="p-6" aria-labelledby="public-reviews-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="public-reviews-heading" className="text-2xl font-bold text-foreground">{title}</h2>
        {result && result.stats.totalReviews > 0 && (
          <p className="text-sm text-foreground-secondary" aria-label={`${result.stats.averageRating} out of 5 from ${result.stats.totalReviews} reviews`}>
            {result.stats.averageRating.toFixed(1)} / 5 · {result.stats.totalReviews} reviews
          </p>
        )}
      </div>

      {loading && <p role="status" className="mt-4 text-sm text-foreground-secondary">Loading reviews…</p>}
      {!loading && error && (
        <div className="mt-4">
          <p role="alert" className="mb-3 text-sm text-foreground-secondary">Reviews could not be loaded.</p>
          <Button
            variant="ghost"
            onClick={() => {
              setLoading(true);
              setError(false);
              setRetryKey((value) => value + 1);
            }}
          >
            Retry
          </Button>
        </div>
      )}
      {!loading && !error && result?.reviews.length === 0 && (
        <p className="mt-4 text-sm text-foreground-secondary">No reviews yet.</p>
      )}
      {!loading && !error && result && result.reviews.length > 0 && (
        <>
          <ul className="mt-4 divide-y divide-border">
            {result.reviews.map((review) => (
              <li key={review._id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{review.customer?.name || 'Customer'}</p>
                  <p className="text-sm text-foreground-secondary" aria-label={`${review.rating} out of 5 stars`}>
                    {review.rating} / 5
                  </p>
                </div>
                {review.review && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground-secondary">{review.review}</p>}
                <time className="mt-2 block text-xs text-foreground-secondary" dateTime={review.createdAt}>
                  {new Date(review.createdAt).toLocaleDateString()}
                </time>
              </li>
            ))}
          </ul>
          {result.pagination.totalPages > 1 && (
            <nav className="mt-5 flex items-center justify-between" aria-label="Review pages">
              <Button variant="ghost" disabled={page <= 1} onClick={() => {
                setLoading(true);
                setError(false);
                setPage((value) => value - 1);
              }}>
                Previous
              </Button>
              <span className="text-sm text-foreground-secondary">
                Page {result.pagination.page} of {result.pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                disabled={page >= result.pagination.totalPages}
                onClick={() => {
                  setLoading(true);
                  setError(false);
                  setPage((value) => value + 1);
                }}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}
    </Card>
  );
}
