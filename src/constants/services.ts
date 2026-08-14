/**
 * Service-related constants
 */

export const SERVICE_CATEGORY = {
  HAIRCUT: 'HAIRCUT',
  BEARD: 'BEARD',
  HAIR_STYLING: 'HAIR_STYLING',
  HAIR_COLOR: 'HAIR_COLOR',
  FACIAL: 'FACIAL',
  GROOMING: 'GROOMING',
  KIDS: 'KIDS',
  OTHER: 'OTHER',
} as const;

export type ServiceCategory = (typeof SERVICE_CATEGORY)[keyof typeof SERVICE_CATEGORY];

export const SERVICE_CATEGORY_ARRAY = Object.values(SERVICE_CATEGORY);

/**
 * Barber-related constants
 */

export const BARBER_SPECIALIZATION = {
  HAIRCUT: 'HAIRCUT',
  BEARD: 'BEARD',
  HAIR_STYLING: 'HAIR_STYLING',
  HAIR_COLOR: 'HAIR_COLOR',
  FACIAL: 'FACIAL',
  GROOMING: 'GROOMING',
  KIDS_HAIRCUT: 'KIDS_HAIRCUT',
  BRIDAL: 'BRIDAL',
  OTHER: 'OTHER',
} as const;

export type BarberSpecialization = (typeof BARBER_SPECIALIZATION)[keyof typeof BARBER_SPECIALIZATION];

export const BARBER_SPECIALIZATION_ARRAY = Object.values(BARBER_SPECIALIZATION);

/**
 * Salon-related constants
 */

export const SALON_FACILITY = {
  PARKING: 'PARKING',
  AC: 'AC',
  WIFI: 'WIFI',
  CARD_PAYMENT: 'CARD_PAYMENT',
  UPI: 'UPI',
  WAITING_AREA: 'WAITING_AREA',
  WASHROOM: 'WASHROOM',
  KIDS_FRIENDLY: 'KIDS_FRIENDLY',
  HOME_SERVICE: 'HOME_SERVICE',
} as const;

export type SalonFacility = (typeof SALON_FACILITY)[keyof typeof SALON_FACILITY];

export const SALON_FACILITY_ARRAY = Object.values(SALON_FACILITY);
