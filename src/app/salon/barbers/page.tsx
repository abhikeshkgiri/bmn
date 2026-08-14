'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import { BARBER_SPECIALIZATION } from '@/constants/services';
import { Eye, EyeOff, Trash2, Plus } from 'lucide-react';

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
  experienceYears: number;
  specializations: string[];
  services?: Service[];
  isActive: boolean;
  isVerified: boolean;
  offersHomeService: boolean;
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
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    bio: '',
    experienceYears: '0',
    specializations: [] as string[],
    profileImage: '',
    offersHomeService: false,
    homeServiceRadius: '10',
  });

  // Fetch salons
  useEffect(() => {
    const fetchSalons = async () => {
      try {
        const response = await fetch('/api/salons?limit=100');
        const result = await response.json();

        if (result.success) {
          const userSalons = result.data || [];
          setSalons(userSalons);

          if (userSalons.length > 0) {
            setSelectedSalonId(userSalons[0]._id);
          }
        }
      } catch {
        console.error('Failed to fetch salons');
      }
    };

    fetchSalons();
  }, []);



  // Fetch barbers for selected salon
  useEffect(() => {
    if (!selectedSalonId) return;

    const fetchBarbers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/barbers?salonId=${selectedSalonId}&limit=100`);
        const result = await response.json();

        if (result.success) {
          setBarbers(result.data);
        }
      } catch {
        console.error('Failed to fetch barbers');
      } finally {
        setLoading(false);
      }
    };

    fetchBarbers();
  }, [selectedSalonId]);

  const handleCreateBarber = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        salonId: selectedSalonId,
        userId: formData.userId,
        name: formData.name,
        bio: formData.bio,
        experienceYears: parseInt(formData.experienceYears),
        specializations: formData.specializations,
        profileImage: formData.profileImage,
        offersHomeService: formData.offersHomeService,
        homeServiceRadius: formData.offersHomeService ? parseInt(formData.homeServiceRadius) : undefined,
      };

      const response = await fetch('/api/barbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        setBarbers([result.data, ...barbers]);
        resetForm();
        setShowForm(false);
      } else {
        alert('Error creating barber: ' + result.error?.message);
      }
    } catch (error) {
      alert('Failed to create barber: ' + String(error));
    }
  };

  const handleToggleStatus = async (barberId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/barbers/${barberId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const result = await response.json();

      if (result.success) {
        setBarbers(barbers.map((b) => (b._id === barberId ? { ...b, isActive: !currentStatus } : b)));
      }
    } catch (error) {
      alert('Failed to update barber status: ' + String(error));
    }
  };

  const handleDeleteBarber = async (barberId: string) => {
    if (!confirm('Are you sure you want to deactivate this barber?')) return;

    try {
      const response = await fetch(`/api/barbers/${barberId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setBarbers(barbers.filter((b) => b._id !== barberId));
      }
    } catch (error) {
      alert('Failed to delete barber: ' + String(error));
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      name: '',
      bio: '',
      experienceYears: '0',
      specializations: [],
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

  const filteredBarbers = barbers.filter(
    (barber) =>
      barber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barber.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (salons.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">No Salons Found</h1>
            <p className="text-foreground-secondary mb-6">
              You need to create a salon first to manage barbers.
            </p>
            <Button variant="primary" onClick={() => router.push('/salons')}>
              View Salons
            </Button>
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
          <p className="text-foreground-secondary">Manage your salon barbers and profiles</p>
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
            placeholder="Search barbers..."
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
            New Barber
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card className="p-6 mb-8 space-y-4">
            <h2 className="text-xl font-bold text-foreground">Add New Barber</h2>

            <form onSubmit={handleCreateBarber} className="space-y-4">
              {/* User ID */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  User/Barber Account ID *
                </label>
                <Input
                  required
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  placeholder="Enter user ID (24-char MongoDB ID)"
                />
                <p className="text-xs text-foreground-secondary mt-1">
                  The user must exist in the system and have BARBER role
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Barber Name *
                </label>
                <Input
                  required
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
                    step="0.5"
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
                      value={formData.homeServiceRadius}
                      onChange={(e) =>
                        setFormData({ ...formData, homeServiceRadius: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2">
                <Button variant="primary" type="submit">
                  Add Barber
                </Button>
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
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
        ) : filteredBarbers.length > 0 ? (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBarber(barber._id)}
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
            <p className="text-foreground-secondary mb-4">No barbers yet</p>
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              Add Your First Barber
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
