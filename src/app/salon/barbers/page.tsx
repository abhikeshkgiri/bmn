'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import { BARBER_SPECIALIZATION } from '@/constants/services';
import { USER_ROLES } from '@/constants/roles';
import { Eye, EyeOff, Pencil, Plus } from 'lucide-react';

interface Service {
  _id: string;
  name: string;
  duration: number;
  price: number;
}

interface Barber {
  _id: string;
  name: string;
  slug: string;
  bio?: string;
  profileImage?: string;
  experienceYears: number;
  specializations: string[];
  services?: Array<Service | string>;
  isActive: boolean;
  isVerified: boolean;
  offersHomeService: boolean;
  homeServiceRadius?: number;
  user?: {
    _id: string;
    name: string;
    phone: string;
  };
}

interface Salon {
  _id: string;
  name: string;
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

export default function SalonBarbersPage() {
  const router = useRouter();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [selectedSalonId, setSelectedSalonId] = useState('');
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [barberError, setBarberError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyBarberId, setBusyBarberId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [ownerReloadKey, setOwnerReloadKey] = useState(0);
  const [barberReloadKey, setBarberReloadKey] = useState(0);
  const [serviceReloadKey, setServiceReloadKey] = useState(0);
  const [barberPage, setBarberPage] = useState(1);
  const [barberTotalPages, setBarberTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    bio: '',
    experienceYears: '0',
    specializations: [] as string[],
    services: [] as string[],
    profileImage: '',
    offersHomeService: false,
    homeServiceRadius: '10',
  });

  // Load only the authenticated owner's salon; public discovery omits pending salons.
  useEffect(() => {
    const controller = new AbortController();
    const fetchOwnerSalon = async () => {
      let salonFound = false;
      try {
        setLoading(true);
        setLoadError('');
        const authResponse = await fetch('/api/auth/me', { signal: controller.signal });
        if (!authResponse.ok) {
          router.replace('/login?next=%2Fsalon%2Fbarbers');
          return;
        }
        const auth = await authResponse.json();
        if (auth?.user?.role !== USER_ROLES.SALON_OWNER) {
          setLoadError('Only salon owners can manage barbers.');
          return;
        }

        const response = await fetch('/api/dashboard/salon/profile', { signal: controller.signal });
        const result = await response.json();
        if (response.status === 404 && result?.error?.code === 'SALON_NOT_FOUND') {
          router.replace('/salon/onboarding');
          return;
        }
        if (!response.ok || !result.success) throw new Error(result?.error?.message || 'Failed to load your salon.');
        setSalons([result.data]);
        setSelectedSalonId(result.data._id);
        salonFound = true;
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load your salon.');
      } finally {
        if (!controller.signal.aborted && !salonFound) setLoading(false);
      }
    };

    void fetchOwnerSalon();
    return () => controller.abort();
  }, [ownerReloadKey, router]);

  // Fetch barbers for selected salon
  useEffect(() => {
    if (!selectedSalonId) return;

    const controller = new AbortController();
    const fetchBarbers = async () => {
      try {
        setLoading(true);
        setBarberError('');
        const response = await fetch(
          `/api/barbers?salonId=${encodeURIComponent(selectedSalonId)}&limit=50&page=${barberPage}`,
          { signal: controller.signal }
        );
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result?.error?.message || 'Failed to load barbers.');
        }
        setBarbers(result.data);
        setBarberTotalPages(result.pagination?.totalPages || 1);
      } catch (error) {
        if (controller.signal.aborted) return;
        setBarberError(error instanceof Error ? error.message : 'Failed to load barbers.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchBarbers();
    return () => controller.abort();
  }, [selectedSalonId, barberPage, barberReloadKey]);

  useEffect(() => {
    if (!selectedSalonId) return;
    const controller = new AbortController();
    const loadServices = async () => {
      setServicesLoading(true);
      setServicesError('');
      try {
        const response = await fetch(
          `/api/services?salonId=${encodeURIComponent(selectedSalonId)}&isActive=true&limit=50`,
          { signal: controller.signal }
        );
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result?.error?.message || 'Failed to load salon services.');
        }
        if (!controller.signal.aborted) setServices(result.data);
        if (!controller.signal.aborted) setServicesError('');
      } catch (error) {
        if (!controller.signal.aborted) {
          setServices([]);
          setServicesError(error instanceof Error ? error.message : 'Failed to load salon services.');
        }
      } finally {
        if (!controller.signal.aborted) setServicesLoading(false);
      }
    };
    void loadServices();
    return () => controller.abort();
  }, [selectedSalonId, serviceReloadKey]);

  const handleSubmitBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !selectedSalonId || servicesError) return;
    setSaving(true);
    setFormError('');
    setNotice('');

    try {
      const payload = {
        ...(!editingId && { salonId: selectedSalonId, userId: formData.userId.trim() }),
        name: formData.name,
        bio: formData.bio,
        experienceYears: Number(formData.experienceYears),
        specializations: formData.specializations,
        services: formData.services,
        profileImage: formData.profileImage.trim(),
        offersHomeService: formData.offersHomeService,
        homeServiceRadius: formData.offersHomeService ? Number(formData.homeServiceRadius) : undefined,
      };

      const response = await fetch(editingId ? `/api/barbers/${editingId}` : '/api/barbers', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const details = result?.error?.details
          ?.map((issue: { path?: (string | number)[]; message?: string }) =>
            `${issue.path?.join('.') || 'Barber'}: ${issue.message || 'Invalid value'}`
          )
          .join('; ');
        throw new Error(details || result?.error?.message || 'Failed to save barber.');
      }
      setBarbers((current) => editingId
        ? current.map((barber) => barber._id === editingId ? result.data : barber)
        : [result.data, ...current]);
      setNotice(editingId ? 'Barber profile updated successfully.' : 'Barber profile added. It may require verification before public display.');
      if (!editingId) {
        setBarberPage(1);
        setBarberReloadKey((key) => key + 1);
      }
      resetForm();
      setShowForm(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save barber.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (barberId: string, currentStatus: boolean) => {
    if (busyBarberId) return;
    setBusyBarberId(barberId);
    setBarberError('');
    setNotice('');
    try {
      const response = await fetch(`/api/barbers/${barberId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message || 'Failed to update barber status.');
      }
      setBarbers((current) => current.map((barber) => barber._id === barberId ? result.data : barber));
      setNotice(`Barber ${currentStatus ? 'deactivated' : 'activated'} successfully.`);
    } catch (error) {
      setBarberError(error instanceof Error ? error.message : 'Failed to update barber status.');
    } finally {
      setBusyBarberId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      name: '',
      bio: '',
      experienceYears: '0',
      specializations: [],
      services: [],
      profileImage: '',
      offersHomeService: false,
      homeServiceRadius: '10',
    });
  };

  const toggleSpecialization = (spec: string) => {
    setFormData((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter((s) => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  const toggleService = (serviceId: string) => {
    setFormData((current) => ({
      ...current,
      services: current.services.includes(serviceId)
        ? current.services.filter((id) => id !== serviceId)
        : [...current.services, serviceId],
    }));
  };

  const startEditing = (barber: Barber) => {
    setEditingId(barber._id);
    setFormData({
      userId: '',
      name: barber.name,
      bio: barber.bio || '',
      experienceYears: String(barber.experienceYears),
      specializations: barber.specializations || [],
      services: (barber.services || [])
        .map((service) => typeof service === 'string' ? service : service._id)
        .filter((id) => services.some((service) => service._id === id)),
      profileImage: barber.profileImage || '',
      offersHomeService: barber.offersHomeService,
      homeServiceRadius: String(barber.homeServiceRadius || 10),
    });
    setFormError('');
    setNotice('');
    setShowForm(true);
  };

  const filteredBarbers = barbers.filter(
    (barber) =>
      barber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barber.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loadError) {
    return <div className="min-h-screen bg-white px-4 py-12"><Card className="mx-auto max-w-2xl p-8 text-center" role="alert"><h1 className="text-2xl font-bold">Unable to load barber management</h1><p className="mt-3 text-foreground-secondary">{loadError}</p><Button className="mt-5" variant="outline" onClick={() => setOwnerReloadKey((key) => key + 1)}>Try again</Button></Card></div>;
  }

  if (loading && salons.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><Spinner size="lg" /></div>;
  }

  if (salons.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card className="p-8 text-center" role="alert">
            <h1 className="text-2xl font-bold text-foreground mb-2">No salon found</h1>
            <p className="text-foreground-secondary mb-6">Complete salon onboarding before managing barbers.</p>
            <Button variant="primary" onClick={() => router.push('/salon/onboarding')}>Salon onboarding</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Barber Management</h1>
          <p className="text-foreground-secondary">Manage barber profiles associated with your salon</p>
          <Link className="mt-3 inline-block text-sm text-brand-pink underline" href="/dashboard/salon">Back to salon dashboard</Link>
        </div>

        <Card className="mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Barber account required</h2>
            <p className="mt-1 text-sm text-foreground-secondary">Barbers create their own account through onboarding. Add the existing account ID here; owners cannot create barber credentials.</p>
          </div>
          <Link href="/barber/onboarding"><Button type="button" variant="outline">Barber onboarding</Button></Link>
        </Card>

        {salons[0] && <p className="mb-6 text-sm text-foreground-secondary">Managing barbers for <span className="font-medium text-foreground">{salons[0].name}</span></p>}
        {notice && <Card className="mb-4 p-4 text-green-800" role="status">{notice}</Card>}
        {barberError && <Card className="mb-4 p-4" role="alert"><p className="mb-3 text-red-600">{barberError}</p><Button variant="outline" onClick={() => setBarberReloadKey((key) => key + 1)}>Try again</Button></Card>}
        {servicesError && <Card className="mb-4 p-4" role="alert"><p className="mb-3 text-red-600">{servicesError}</p><Button variant="outline" onClick={() => setServiceReloadKey((key) => key + 1)}>Retry service list</Button></Card>}

        {/* Search & Create */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <Input
            aria-label="Search barbers"
            placeholder="Search barbers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="primary"
            disabled={saving || Boolean(servicesError)}
            onClick={() => {
              resetForm();
              setFormError('');
              setNotice('');
              setShowForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            New Barber
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card className="p-6 mb-8 space-y-4">
            <h2 className="text-xl font-bold text-foreground">{editingId ? 'Edit barber profile' : 'Add new barber'}</h2>

            {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            <form onSubmit={handleSubmitBarber} className="space-y-4">
              <fieldset disabled={saving || servicesLoading} className="space-y-4">
              {/* User ID */}
              {!editingId && <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  User/Barber Account ID *
                </label>
                <Input
                  required
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value.trim() })}
                  placeholder="Enter user ID (24-char MongoDB ID)"
                />
                <p className="text-xs text-foreground-secondary mt-1">
                  The user must have an active BARBER account and must not already be associated with another salon. Never enter another person&apos;s credentials.
                </p>
              </div>}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Barber Name *
                </label>
                <Input
                  required
                  minLength={2}
                  maxLength={100}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Rahul Kumar"
                />
              </div>

              {/* Experience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Years of Experience *
                  </label>
                  <Input
                    required
                    type="number"
                    min="0"
                    max="60"
                    step="1"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Profile Image URL
                  </label>
                  <Input
                    type="url"
                    value={formData.profileImage}
                    onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Bio / Description
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Brief description of the barber"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-white text-foreground"
                  rows={3}
                  maxLength={2000}
                />
              </div>

              {/* Specializations */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Specializations
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(BARBER_SPECIALIZATION).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.specializations.includes(value)}
                        onChange={() => toggleSpecialization(value)}
                        className="w-4 h-4 accent-brand-pink"
                      />
                      <span className="text-sm text-foreground">
                        {SPECIALIZATION_LABELS[value] || value}
                      </span>
                    </label>
                  ))}
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-foreground">Active salon services</legend>
                  {servicesLoading ? <p className="text-sm text-foreground-secondary">Loading services…</p> : services.length ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {services.map((service) => (
                        <label key={service._id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.services.includes(service._id)}
                            onChange={() => toggleService(service._id)}
                          />
                          <span>{service.name} ({service.duration} min)</span>
                        </label>
                      ))}
                    </div>
                  ) : <p className="text-sm text-foreground-secondary">No active services are available to assign.</p>}
                </fieldset>
              </div>

              {/* Home Service */}
              <div className="space-y-3 p-4 bg-background rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.offersHomeService}
                    onChange={(e) => setFormData({ ...formData, offersHomeService: e.target.checked })}
                    className="w-4 h-4 accent-brand-pink"
                  />
                  <span className="text-sm font-medium text-foreground">Offers Home Service</span>
                </label>

                {formData.offersHomeService && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Service Radius (km)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      required
                      step="1"
                      value={formData.homeServiceRadius}
                      onChange={(e) =>
                        setFormData({ ...formData, homeServiceRadius: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              </fieldset>
              <div className="flex gap-2">
                <Button variant="primary" type="submit" isLoading={saving} disabled={servicesLoading || Boolean(servicesError)}>
                  {editingId ? 'Save barber' : 'Add barber'}
                </Button>
                <Button variant="ghost" type="button" disabled={saving} onClick={() => { setShowForm(false); resetForm(); setFormError(''); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Barbers List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : barberError ? null : filteredBarbers.length > 0 ? (
          <div className="space-y-4">
            {filteredBarbers.map((barber) => (
              <Card key={barber._id} className="p-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg text-foreground">{barber.name}</h3>
                      {barber.isVerified && (
                        <Badge variant="success" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground-secondary mb-2">{barber.bio}</p>

                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-sm text-foreground-secondary">
                        {barber.experienceYears} years
                      </span>
                      {!barber.isActive && <Badge variant="error" className="text-xs">Inactive</Badge>}
                    </div>

                    {barber.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
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

                    {barber.services && barber.services.length > 0 && (
                      <p className="mt-2 text-sm text-foreground-secondary">
                        Services: {barber.services.map((service) =>
                          typeof service === 'string' ? services.find((option) => option._id === service)?.name : service.name
                        ).filter(Boolean).join(', ') || 'Assigned services'}
                      </p>
                    )}

                    {barber.offersHomeService && (
                      <Badge variant="success" className="text-xs mt-2">
                        Home Service Available
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={Boolean(busyBarberId) || saving}
                      onClick={() => startEditing(barber)}
                      className="flex items-center gap-1"
                    >
                      <Pencil size={16} />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={Boolean(busyBarberId) || saving}
                      onClick={() => handleToggleStatus(barber._id, barber.isActive)}
                      className="flex items-center gap-1"
                    >
                      {barber.isActive ? (
                        <>
                          <EyeOff size={16} />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Eye size={16} />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-foreground-secondary mb-4">{searchTerm ? 'No barbers match your search.' : 'No barbers are associated with this salon yet.'}</p>
            {!searchTerm && <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setFormError('');
                setShowForm(true);
              }}
            >
              Add Your First Barber
            </Button>}
          </Card>
        )}
        {!loading && barberTotalPages > 1 && (
          <nav className="mt-6 flex items-center justify-center gap-4" aria-label="Barber list pages">
            <Button variant="outline" disabled={barberPage <= 1} onClick={() => setBarberPage((current) => current - 1)}>Previous</Button>
            <span className="text-sm text-foreground-secondary">Page {barberPage} of {barberTotalPages}</span>
            <Button variant="outline" disabled={barberPage >= barberTotalPages} onClick={() => setBarberPage((current) => current + 1)}>Next</Button>
          </nav>
        )}
      </div>
    </div>
  );
}
