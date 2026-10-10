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
import { Trash2, Eye, EyeOff, Plus } from 'lucide-react';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    const fetchOwnerSalon = async () => {
      try {
        const response = await fetch('/api/dashboard/salon/profile');
        const result = await response.json();

        if (response.status === 404 && result?.error?.code === 'SALON_NOT_FOUND') {
          router.replace('/salon/onboarding');
          return;
        }
        if (!response.ok || !result.success) throw new Error(result?.error?.message || 'Failed to load your salon.');
        setSalons([result.data]);
        setSelectedSalonId(result.data._id);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Failed to load your salon.');
        setLoading(false);
      }
    };

    void fetchOwnerSalon();
  }, [router]);

  // Fetch services for selected salon
  useEffect(() => {
    if (!selectedSalonId) return;

    const fetchServices = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/services?salonId=${selectedSalonId}&limit=100`);
        const result = await response.json();

        if (result.success) {
          setServices(result.data);
        }
      } catch {
        console.error('Failed to fetch services');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [selectedSalonId]);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        salonId: selectedSalonId,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        duration: parseInt(formData.duration),
        price: Math.round(parseFloat(formData.price) * 100), // Convert INR to paise
        discountPrice: formData.discountPrice
          ? Math.round(parseFloat(formData.discountPrice) * 100)
          : undefined,
        image: formData.image,
      };

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        setServices([result.data, ...services]);
        resetForm();
        setShowForm(false);
      } else {
        alert('Error creating service: ' + result.error?.message);
      }
    } catch (error) {
      alert('Failed to create service: ' + String(error));
    }
  };

  const handleToggleStatus = async (serviceId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/services/${serviceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const result = await response.json();

      if (result.success) {
        setServices(
          services.map((s) => (s._id === serviceId ? { ...s, isActive: !currentStatus } : s))
        );
      }
    } catch (error) {
      alert('Failed to update service status: ' + String(error));
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to deactivate this service?')) return;

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setServices(services.filter((s) => s._id !== serviceId));
      }
    } catch (error) {
      alert('Failed to delete service: ' + String(error));
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

  if (salons.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">No Salons Found</h1>
            <p className="text-foreground-secondary mb-6">
              You need to create a salon first to manage services.
            </p>
            <Button variant="primary" onClick={() => router.push('/salons')}>
              View Salons
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (loadError) {
    return <div className="min-h-screen bg-white px-4 py-12"><Card className="mx-auto max-w-2xl p-8 text-center"><h1 className="text-2xl font-bold">Unable to load salon services</h1><p className="mt-3 text-foreground-secondary">{loadError}</p><Button className="mt-5" variant="outline" onClick={() => router.push('/salon/onboarding')}>Salon onboarding</Button></Card></div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Service Management</h1>
          <p className="text-foreground-secondary">Create and manage your salon services</p>
        </div>

        {/* Salon Selector */}
        {salons.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">Select Salon</label>
            <select
              value={selectedSalonId}
              onChange={(e) => setSelectedSalonId(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-white text-foreground font-medium"
            >
              {salons.map((salon) => (
                <option key={salon._id} value={salon._id}>
                  {salon.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search & Create */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
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

            <form onSubmit={handleCreateService} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Service Name *
                  </label>
                  <Input
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
                    min="5"
                    max="480"
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
                />
              </div>

              <div className="flex gap-2">
                <Button variant="primary" type="submit">
                  {editingId ? 'Update Service' : 'Create Service'}
                </Button>
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
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
                        {service.discountPrice ? (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteService(service._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-foreground-secondary mb-4">No services yet</p>
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              Create Your First Service
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
