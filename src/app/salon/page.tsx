'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';
import { USER_ROLES } from '@/constants/roles';
import Link from 'next/link';

export default function SalonDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndSalon = async () => {
      try {
        // Check if user is authenticated
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/login');
          return;
        }

        const userData = await response.json();

        // Check if user is salon owner or admin
        if (![USER_ROLES.SALON_OWNER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(userData.user.role)) {
          setError('You do not have permission to access this page');
          setLoading(false);
          return;
        }

        // Fetch salons for this user
        // Note: In a real app, this would be a proper API endpoint
        // For now, redirect to list salons
        router.push('/salons');
      } catch {
        setError('Failed to load user information');
        setLoading(false);
      }
    };

    fetchUserAndSalon();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card className="bg-red-50 border-red-200 p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
            <p className="text-red-500 mb-6">{error}</p>
            <Link href="/">
              <Button variant="primary">Back to Home</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  // Redirect to salon management or list
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Salon Management</h1>
          <p className="text-foreground-secondary mb-6">Welcome to your salon management dashboard</p>
          <Link href="/salons">
            <Button variant="primary">Browse Salons</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
