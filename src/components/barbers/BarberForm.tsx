'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BarberCreateSchema, BarberUpdateSchema, type BarberCreateInput, type BarberUpdateInput } from '@/validations/barber.schema';
import { BARBER_SPECIALIZATION } from '@/constants/services';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Service {
  _id: string;
  name: string;
  price: number;
  duration: number;
}

interface PortfolioItem {
  image: string;
  title?: string;
  description?: string;
}

interface BarberFormProps {
  mode: 'create' | 'edit';
  salonId?: string;
  initialData?: {
    _id?: string;
    userId?: string;
    name?: string;
    bio?: string;
    experienceYears?: number;
    specializations?: string[];
    services?: string[];
    profileImage?: string;
    portfolio?: PortfolioItem[];
    offersHomeService?: boolean;
    homeServiceRadius?: number;
  };
  onSubmit: (data: BarberCreateInput | BarberUpdateInput) => Promise<void>;
  isLoading?: boolean;
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

export default function BarberForm({
  mode,
  salonId,
  initialData,
  onSubmit,
  isLoading = false,
}: BarberFormProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(initialData?.portfolio || []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<BarberCreateInput | BarberUpdateInput>({
    resolver: zodResolver(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mode === 'create' ? BarberCreateSchema : BarberUpdateSchema) as any
    ),
    defaultValues: initialData || {
      offersHomeService: false,
      homeServiceRadius: 10,
      specializations: [],
    },
  });

  const offersHomeService = watch('offersHomeService');

  // Fetch services for the salon
  useEffect(() => {
    if (!salonId) return;

    const fetchServices = async () => {
      try {
        const response = await fetch(`/api/services?salonId=${salonId}&limit=100`);
        const result = await response.json();

        if (result.success) {
          setServices(result.data);
        }
      } catch {
        console.error('Failed to fetch services');
      }
    };

    fetchServices();
  }, [salonId]);

  const handlePortfolioAdd = () => {
    setPortfolioItems([
      ...portfolioItems,
      {
        image: '',
        title: '',
        description: '',
      },
    ]);
  };

  const handlePortfolioUpdate = (index: number, field: string, value: string) => {
    const updated = [...portfolioItems];
    updated[index] = { ...updated[index], [field]: value };
    setPortfolioItems(updated);
  };

  const handlePortfolioRemove = (index: number) => {
    setPortfolioItems(portfolioItems.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (formData: BarberCreateInput | BarberUpdateInput) => {
    try {
      const payload = {
        ...formData,
        portfolio: portfolioItems.filter((item) => item.image),
      };

      await onSubmit(payload);
      reset();
    } catch {
      console.error('Form submission error');
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Mode-specific: User ID only for create */}
      {mode === 'create' && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            User/Barber Account ID *
          </label>
          <Input
            {...register('userId')}
            placeholder="24-character MongoDB User ID"
            disabled={isLoading}
          />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(errors as any).userId && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <p className="text-sm text-red-600 mt-1">{String(((errors as any).userId as Record<string, unknown>).message)}</p>
          )}
          <p className="text-xs text-foreground-secondary mt-1">
            The user must exist and have the BARBER role
          </p>
        </div>
      )}

      {/* Salon ID for create */}
      {mode === 'create' && salonId && (
        <input type="hidden" {...register('salonId')} value={salonId} />
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Barber Name *
        </label>
        <Input
          {...register('name')}
          placeholder="e.g., Rahul Kumar"
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{String(errors.name.message)}</p>
        )}
      </div>

      {/* Bio and Experience */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Years of Experience *
          </label>
          <Input
            {...register('experienceYears', { valueAsNumber: true })}
            type="number"
            min="0"
            max="60"
            step="0.5"
            placeholder="0"
            disabled={isLoading}
          />
          {errors.experienceYears && (
            <p className="text-sm text-red-600 mt-1">
              {String(errors.experienceYears.message)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Profile Image URL
          </label>
          <Input
            {...register('profileImage')}
            type="url"
            placeholder="https://..."
            disabled={isLoading}
          />
          {errors.profileImage && (
            <p className="text-sm text-red-600 mt-1">
              {String(errors.profileImage.message)}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Bio / Description
        </label>
        <textarea
          {...register('bio')}
          placeholder="Brief description of the barber"
          className="w-full px-4 py-2 border border-border rounded-lg bg-white text-foreground font-medium"
          rows={3}
          disabled={isLoading}
        />
        {errors.bio && (
          <p className="text-sm text-red-600 mt-1">{String(errors.bio.message)}</p>
        )}
      </div>

      {/* Specializations */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          Specializations
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(BARBER_SPECIALIZATION).map(([key, value]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                value={value}
                {...register('specializations')}
                className="w-4 h-4 accent-brand-pink"
                disabled={isLoading}
              />
              <span className="text-sm text-foreground">
                {SPECIALIZATION_LABELS[value] || value}
              </span>
            </label>
          ))}
        </div>
        {errors.specializations && (
          <p className="text-sm text-red-600 mt-1">
            {String(errors.specializations.message)}
          </p>
        )}
      </div>

      {/* Services */}
      {services.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Services Offered
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {services.map((service) => (
              <label key={service._id} className="flex items-center gap-2 cursor-pointer p-2 bg-background rounded">
                <input
                  type="checkbox"
                  value={service._id}
                  {...register('services')}
                  className="w-4 h-4 accent-brand-pink"
                  disabled={isLoading}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{service.name}</p>
                  <p className="text-xs text-foreground-secondary">
                    ₹{Math.round(service.price / 100)} • {service.duration}min
                  </p>
                </div>
              </label>
            ))}
          </div>
          {errors.services && (
            <p className="text-sm text-red-600 mt-1">
              {String(errors.services.message)}
            </p>
          )}
        </div>
      )}

      {/* Home Service */}
      <div className="space-y-3 p-4 bg-background rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('offersHomeService')}
            className="w-4 h-4 accent-brand-pink"
            disabled={isLoading}
          />
          <span className="text-sm font-medium text-foreground">Offers Home Service</span>
        </label>

        {offersHomeService && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Service Radius (km) *
            </label>
            <Input
              {...register('homeServiceRadius', { valueAsNumber: true })}
              type="number"
              min="1"
              max="100"
              placeholder="10"
              disabled={isLoading}
            />
            {errors.homeServiceRadius && (
              <p className="text-sm text-red-600 mt-1">
                {String(errors.homeServiceRadius.message)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Portfolio */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          Portfolio Images
        </label>

        {portfolioItems.length > 0 && (
          <div className="space-y-3 mb-3">
            {portfolioItems.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-background rounded-lg space-y-2 border border-border"
              >
                <input
                  type="url"
                  value={item.image}
                  onChange={(e) => handlePortfolioUpdate(index, 'image', e.target.value)}
                  placeholder="Image URL *"
                  className="w-full px-3 py-2 border border-border rounded text-sm bg-white text-foreground"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={item.title || ''}
                  onChange={(e) => handlePortfolioUpdate(index, 'title', e.target.value)}
                  placeholder="Title (optional)"
                  className="w-full px-3 py-2 border border-border rounded text-sm bg-white text-foreground"
                  disabled={isLoading}
                />
                <textarea
                  value={item.description || ''}
                  onChange={(e) => handlePortfolioUpdate(index, 'description', e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 border border-border rounded text-sm bg-white text-foreground"
                  rows={2}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => handlePortfolioRemove(index)}
                  className="w-full px-3 py-1 text-sm text-red-600 hover:text-red-700 font-medium"
                  disabled={isLoading}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          onClick={handlePortfolioAdd}
          disabled={isLoading}
        >
          + Add Portfolio Item
        </Button>
      </div>

      {/* Submit */}
      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create Barber' : 'Update Barber'}
        </Button>
      </div>
    </form>
  );
}
