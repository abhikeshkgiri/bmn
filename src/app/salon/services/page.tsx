'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import { formatCurrency } from '@/utils/currency';
import { SERVICE_CATEGORY } from '@/constants/services';
import { USER_ROLES } from '@/constants/roles';
import { Eye, EyeOff, Pencil, Plus } from 'lucide-react';

interface Service {
  _id: string;
  name: string;
  description?: string;
  category: string;
  duration: number;
  price: number;
  discountPrice?: number;
  isActive: boolean;
  createdAt: string;
  image?: string;
}

interface Salon {
  _id: string;
  name: string;
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

export default function SalonServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [selectedSalonId, setSelectedSalonId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [servicesError, setServicesError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyServiceId, setBusyServiceId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [serviceReloadKey, setServiceReloadKey] = useState(0);
  const [ownerReloadKey, setOwnerReloadKey] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    duration: '30',
    price: '',
    discountPrice: '',
    image: '',
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
          router.replace('/login?next=%2Fsalon%2Fservices');
          return;
        }
        const authResult = await authResponse.json();
        if (authResult?.user?.role !== USER_ROLES.SALON_OWNER) {
          setLoadError('Only salon owners can manage services.');
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

  // Fetch services for selected salon
  useEffect(() => {
    if (!selectedSalonId) return;

    const controller = new AbortController();
    const fetchServices = async () => {
      try {
        setLoading(true);
        setServicesError('');
        const response = await fetch(
          `/api/services?salonId=${encodeURIComponent(selectedSalonId)}&limit=50&page=${page}`,
          { signal: controller.signal }
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result?.error?.message || 'Failed to load services.');
        }
        setServices(result.data);
        setTotalPages(result.pagination?.totalPages || 1);
      } catch (error) {
        if (controller.signal.aborted) return;
        setServicesError(error instanceof Error ? error.message : 'Failed to load services.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchServices();
    return () => controller.abort();
  }, [page, selectedSalonId, serviceReloadKey]);

  const handleSubmitService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !selectedSalonId) return;
    setSaving(true);
    setFormError('');
    setNotice('');

    try {
      const payload = {
        ...(!editingId && { salonId: selectedSalonId }),
        name: formData.name,
        description: formData.description,
        category: formData.category,
        duration: Number(formData.duration),
        price: Math.round(Number(formData.price) * 100),
        discountPrice: formData.discountPrice
          ? Math.round(Number(formData.discountPrice) * 100)
          : editingId ? null : undefined,
        image: formData.image.trim(),
      };

      const response = await fetch(editingId ? `/api/services/${editingId}` : '/api/services', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const details = result?.error?.details
          ?.map((issue: { path?: (string | number)[]; message?: string }) =>
            `${issue.path?.join('.') || 'Service'}: ${issue.message || 'Invalid value'}`
          )
          .join('; ');
        throw new Error(details || result?.error?.message || 'Failed to save service.');
      }

      if (editingId) {
        setServices((current) => current.map((service) =>
          service._id === editingId ? result.data : service
        ));
        setNotice('Service updated successfully.');
      } else {
        setPage(1);
        setServiceReloadKey((key) => key + 1);
        setNotice('Service created successfully.');
      }
      resetForm();
      setShowForm(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save service.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (serviceId: string, currentStatus: boolean) => {
    if (busyServiceId) return;
    setBusyServiceId(serviceId);
    setServicesError('');
    setNotice('');
    try {
      const response = await fetch(`/api/services/${serviceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message || 'Failed to update service status.');
      }
      setServices((current) => current.map((service) =>
        service._id === serviceId ? result.data : service
      ));
      setNotice(`Service ${currentStatus ? 'deactivated' : 'activated'} successfully.`);
    } catch (error) {
      setServicesError(error instanceof Error ? error.message : 'Failed to update service status.');
    } finally {
      setBusyServiceId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      duration: '30',
      price: '',
      discountPrice: '',
      image: '',
    });
    setEditingId(null);
  };

  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEditing = (service: Service) => {
    setEditingId(service._id);
    setFormData({
      name: service.name,
      description: service.description || '',
      category: service.category,
      duration: String(service.duration),
      price: (service.price / 100).toFixed(2),
      discountPrice: service.discountPrice == null ? '' : (service.discountPrice / 100).toFixed(2),
      image: service.image || '',
    });
    setFormError('');
    setNotice('');
    setShowForm(true);
  };

  if (loading && salons.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><Spinner size="lg" /></div>;
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-white px-4 py-12"><Card className="mx-auto max-w-2xl p-8 text-center" role="alert"><h1 className="text-2xl font-bold">Unable to load salon services</h1><p className="mt-3 text-foreground-secondary">{loadError}</p><Button className="mt-5" variant="outline" onClick={() => setOwnerReloadKey((key) => key + 1)}>Try again</Button></Card></div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Service Management</h1>
          <p className="text-foreground-secondary">Create and manage your salon services</p>
        </div>

        {salons[0] && <p className="mb-6 text-sm text-foreground-secondary">Managing services for <span className="font-medium text-foreground">{salons[0].name}</span></p>}

        {notice && <Card className="mb-4 p-4 text-green-800" role="status">{notice}</Card>}
        {servicesError && (
          <Card className="mb-4 p-4" role="alert">
            <p className="mb-3 text-red-600">{servicesError}</p>
            <Button variant="outline" onClick={() => setServiceReloadKey((key) => key + 1)}>Try again</Button>
          </Card>
        )}

        {/* Search & Create */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <Input
            aria-label="Search salon services"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="primary"
            disabled={saving}
            onClick={() => {
              resetForm();
              setFormError('');
              setNotice('');
              setShowForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            New Service
          </Button>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <Card className="p-6 mb-8 space-y-4">
            <h2 className="text-xl font-bold text-foreground">
              {editingId ? 'Edit Service' : 'Create New Service'}
            </h2>

            {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            <form onSubmit={handleSubmitService} className="space-y-4">
              <fieldset disabled={saving} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Service Name *
                  </label>
                  <Input
                    minLength={2}
                    maxLength={100}
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Men Haircut"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-white text-foreground"
                  >
                    <option value="">Select Category</option>
                    {Object.values(SERVICE_CATEGORY).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Duration (minutes) *
                  </label>
                  <Input
                    required
                    type="number"
                    min="15"
                    max="480"
                    step="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Price (₹) *
                  </label>
                  <Input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g., 300"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Discount Price (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discountPrice}
                    onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Image URL</label>
                  <Input
                    type="url"
                    placeholder="https://"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Service description"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-white text-foreground"
                  rows={3}
                  maxLength={2000}
                />
              </div>
              </fieldset>

              <div className="flex gap-2">
                <Button variant="primary" type="submit" isLoading={saving}>
                  {editingId ? 'Update Service' : 'Create Service'}
                </Button>
                <Button variant="ghost" type="button" disabled={saving} onClick={() => { setShowForm(false); resetForm(); setFormError(''); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Services List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredServices.length > 0 ? (
          <div className="space-y-4">
            {filteredServices.map((service) => (
              <Card key={service._id} className="p-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground">{service.name}</h3>
                    <p className="text-sm text-foreground-secondary">{service.description}</p>

                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="info">{CATEGORY_LABELS[service.category]}</Badge>
                      {!service.isActive && <Badge variant="error">Inactive</Badge>}
                    </div>

                    <div className="flex gap-4 mt-2 text-sm text-foreground-secondary">
                      <span>{service.duration} min</span>
                      <span className="font-medium">
                        {service.discountPrice != null ? (
                          <>
                            <span className="line-through">{formatCurrency(service.price)}</span>
                            <span className="ml-2 text-brand-pink">
                              {formatCurrency(service.discountPrice)}
                            </span>
                          </>
                        ) : (
                          formatCurrency(service.price)
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={Boolean(busyServiceId) || saving}
                      onClick={() => startEditing(service)}
                      className="flex items-center gap-1"
                    >
                      <Pencil size={16} />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={Boolean(busyServiceId) || saving}
                      onClick={() => handleToggleStatus(service._id, service.isActive)}
                      className="flex items-center gap-1"
                    >
                      {service.isActive ? (
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
        ) : servicesError ? null : (
          <Card className="p-8 text-center">
            <p className="text-foreground-secondary mb-4">{searchTerm ? 'No services match your search on this page.' : 'No services yet.'}</p>
            {!searchTerm && <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setFormError('');
                setShowForm(true);
              }}
            >
              Create Your First Service
            </Button>}
          </Card>
        )}
        {!loading && totalPages > 1 && (
          <nav className="mt-6 flex items-center justify-center gap-4" aria-label="Service list pages">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <span className="text-sm text-foreground-secondary">Page {page} of {totalPages}</span>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </nav>
        )}
      </div>
    </div>
  );
}
