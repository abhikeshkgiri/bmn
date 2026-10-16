'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';
import { Input } from '@/components/ui/Input';
import { BOOKING_STATUS } from '@/constants/booking';
import { formatCurrency } from '@/utils/currency';
import { Search } from 'lucide-react';

interface BookingRecord {
  _id: string;
  bookingNumber: string;
  customer?: { _id?: string; name?: string; email?: string; phone?: string };
  barber?: { _id?: string; name?: string };
  service?: { _id?: string; name?: string };
  salon?: { _id?: string; name?: string };
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  bookingType: string;
}

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  [BOOKING_STATUS.PENDING]: 'warning',
  [BOOKING_STATUS.CONFIRMED]: 'info',
  [BOOKING_STATUS.IN_PROGRESS]: 'info',
  [BOOKING_STATUS.COMPLETED]: 'success',
  [BOOKING_STATUS.CANCELLED]: 'error',
  [BOOKING_STATUS.NO_SHOW]: 'error',
};

export default function BarberBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadBookings = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(pageNumber), limit: '10' });
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/barber/bookings?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load bookings');
      }

      setBookings(result.data || []);
      setPage(result.pagination?.page || 1);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const fetchInitialBookings = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page: '1', limit: '10' });
        if (statusFilter !== 'all') params.set('status', statusFilter);

        const response = await fetch(`/api/barber/bookings?${params.toString()}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Failed to load bookings');
        }

        if (!isCancelled) {
          setBookings(result.data || []);
          setPage(result.pagination?.page || 1);
          setTotalPages(result.pagination?.totalPages || 1);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load bookings');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void fetchInitialBookings();

    return () => {
      isCancelled = true;
    };
  }, [statusFilter]);

  const filteredBookings = bookings.filter((booking) => {
    if (!search) return true;
    const text = `${booking.bookingNumber} ${booking.customer?.name || ''} ${booking.service?.name || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  if (loading && bookings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm uppercase tracking-wide text-brand-pink font-medium">Barber bookings</p>
            <h1 className="text-3xl font-bold text-foreground">Appointment management</h1>
          </div>
          <Link href="/barber/dashboard">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        </div>

        <Card className="mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-xs uppercase text-foreground-secondary mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-foreground-secondary" size={16} />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Booking or customer" className="pl-9" />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase text-foreground-secondary mb-1 block">Status</label>
              <select className="w-full border border-border rounded-lg px-3 py-2 bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All</option>
                {Object.values(BOOKING_STATUS).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {error ? (
          <Card className="p-6 text-red-600">{error}</Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Appointments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium">Booking</th>
                      <th className="px-4 py-3 text-sm font-medium">Customer</th>
                      <th className="px-4 py-3 text-sm font-medium">Service</th>
                      <th className="px-4 py-3 text-sm font-medium">Salon</th>
                      <th className="px-4 py-3 text-sm font-medium">Date</th>
                      <th className="px-4 py-3 text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-sm font-medium">Amount</th>
                      <th className="px-4 py-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-foreground-secondary">No appointments found</td>
                      </tr>
                    ) : (
                      filteredBookings.map((booking) => (
                        <tr key={booking._id} className="border-t border-border">
                          <td className="px-4 py-3">
                            <div className="font-medium">{booking.bookingNumber}</div>
                            <div className="text-xs text-foreground-secondary">{booking.bookingType}</div>
                          </td>
                          <td className="px-4 py-3">{booking.customer?.name || 'Customer'}</td>
                          <td className="px-4 py-3">{booking.service?.name || 'Service'}</td>
                          <td className="px-4 py-3">{booking.salon?.name || 'Salon'}</td>
                          <td className="px-4 py-3">
                            <div>{new Date(booking.appointmentDate).toLocaleDateString()}</div>
                            <div className="text-xs text-foreground-secondary">{booking.startTime} - {booking.endTime}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusColors[booking.status] || 'info'}>{booking.status}</Badge>
                          </td>
                          <td className="px-4 py-3">{formatCurrency(booking.totalAmount)}</td>
                          <td className="px-4 py-3">
                            <Link href={`/booking/${booking._id}`}>
                              <Button size="sm" variant="outline">View</Button>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadBookings(page - 1)}>Previous</Button>
            <span className="px-3 py-2 text-sm text-foreground-secondary">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => loadBookings(page + 1)}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
