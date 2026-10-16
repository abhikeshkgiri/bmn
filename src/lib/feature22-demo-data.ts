import { SUPPORTED_LAUNCH_CITIES } from '../constants/launch-cities';
import { BARBER_SPECIALIZATION, SERVICE_CATEGORY } from '../constants/services';
import { FEATURE22_DEMO_KEY_PREFIX } from '../utils/transaction-eligibility';
export { FEATURE22_DEMO_KEY_PREFIX } from '../utils/transaction-eligibility';

export const FEATURE22_DEMO_DATASET = 'feature22-demo-salons-v1';
export const DEMO_IMAGE_PATH = '/salon-placeholder.svg';

export interface DemoSalonFixture {
  key: string;
  city: string;
  name: string;
  slug: string;
  area: string;
  addressLine1: string;
  landmark: string;
  postalCode: string;
  coordinates: [longitude: number, latitude: number];
  concept: string;
}

export const DEMO_SALONS: DemoSalonFixture[] = [
  { key: 'delhi-01', city: 'Delhi', name: 'Copper Comb Studio', slug: 'copper-comb-studio-delhi', area: 'Connaught Place', addressLine1: 'Demo Unit 12, Inner Circle', landmark: 'Near Rajiv Chowk Metro', postalCode: '110001', coordinates: [77.2167, 28.6315], concept: 'precision cuts and classic grooming in a calm central-city studio' },
  { key: 'bengaluru-01', city: 'Bengaluru', name: 'Indigo Chair Collective', slug: 'indigo-chair-collective-bengaluru', area: 'Indiranagar', addressLine1: 'Demo Suite 4, 12th Main Road', landmark: 'Near Indiranagar Metro', postalCode: '560038', coordinates: [77.6412, 12.9719], concept: 'modern fades, beard detailing and considered everyday styling' },
  { key: 'hyderabad-01', city: 'Hyderabad', name: 'Nizami Scissors Room', slug: 'nizami-scissors-room-hyderabad', area: 'Jubilee Hills', addressLine1: 'Demo Shop 8, Road Number 36', landmark: 'Near Jubilee Hills Check Post', postalCode: '500033', coordinates: [78.4071, 17.4326], concept: 'tailored haircuts and traditional beard care with a contemporary finish' },
  { key: 'pune-01', city: 'Pune', name: 'Monsoon Grooming House', slug: 'monsoon-grooming-house-pune', area: 'Koregaon Park', addressLine1: 'Demo Unit 6, North Main Road', landmark: 'Near Osho Garden', postalCode: '411001', coordinates: [73.8939, 18.5362], concept: 'unhurried cuts, wash-and-style appointments and clean beard shaping' },
  { key: 'mumbai-01', city: 'Mumbai', name: 'Harbour & Horn Studio', slug: 'harbour-and-horn-studio-mumbai', area: 'Bandra West', addressLine1: 'Demo Studio 3, Hill Road', landmark: 'Near Bandra Chapel', postalCode: '400050', coordinates: [72.8295, 19.0596], concept: 'city-ready cuts and detailed finishing in a relaxed neighbourhood setting' },
  { key: 'chennai-01', city: 'Chennai', name: 'Marina Mane Atelier', slug: 'marina-mane-atelier-chennai', area: 'T. Nagar', addressLine1: 'Demo Floor 1, Usman Road', landmark: 'Near Panagal Park', postalCode: '600017', coordinates: [80.2341, 13.0418], concept: 'practical, polished haircuts and grooming for Chennai weather and daily life' },
  { key: 'gurugram-01', city: 'Gurugram', name: 'Millennium Fade Works', slug: 'millennium-fade-works-gurugram', area: 'Sector 29', addressLine1: 'Demo Unit 15, Leisure Valley Road', landmark: 'Near Sector 29 market', postalCode: '122001', coordinates: [77.0266, 28.4595], concept: 'sharp fades, tidy beard work and appointment-led grooming' },
  { key: 'kolkata-01', city: 'Kolkata', name: 'Borough Barber Studio', slug: 'borough-barber-studio-kolkata', area: 'Park Street', addressLine1: 'Demo Room 5, Camac Street', landmark: 'Near Park Street Metro', postalCode: '700016', coordinates: [88.352, 22.5535], concept: 'heritage-inspired barbering with clean modern cuts and careful detailing' },
  { key: 'ahmedabad-01', city: 'Ahmedabad', name: 'Sabarmati Style Room', slug: 'sabarmati-style-room-ahmedabad', area: 'Navrangpura', addressLine1: 'Demo Shop 9, C. G. Road', landmark: 'Near Sardar Patel Stadium', postalCode: '380009', coordinates: [72.561, 23.0395], concept: 'thoughtful haircuts, beard trims and low-fuss grooming appointments' },
  { key: 'noida-01', city: 'Noida', name: 'Sector Eighteen Groom Lab', slug: 'sector-eighteen-groom-lab-noida', area: 'Sector 18', addressLine1: 'Demo Suite 11, Atta Market Road', landmark: 'Near Noida Sector 18 Metro', postalCode: '201301', coordinates: [77.3261, 28.5708], concept: 'contemporary cuts and dependable grooming close to the city centre' },
  { key: 'lucknow-01', city: 'Lucknow', name: 'Awadh Comb & Co.', slug: 'awadh-comb-and-co-lucknow', area: 'Hazratganj', addressLine1: 'Demo Unit 7, Mahatma Gandhi Marg', landmark: 'Near Hazratganj Metro', postalCode: '226001', coordinates: [80.9462, 26.85], concept: 'classic barbering, fresh fades and a warm neighbourhood welcome' },
  { key: 'jaipur-01', city: 'Jaipur', name: 'Pink City Grooming Atelier', slug: 'pink-city-grooming-atelier-jaipur', area: 'C-Scheme', addressLine1: 'Demo Studio 2, Sardar Patel Marg', landmark: 'Near Statue Circle', postalCode: '302001', coordinates: [75.7873, 26.9124], concept: 'clean styling and detail-focused grooming inspired by the city' },
  { key: 'ghaziabad-01', city: 'Ghaziabad', name: 'Indirapuram Trim Studio', slug: 'indirapuram-trim-studio-ghaziabad', area: 'Indirapuram', addressLine1: 'Demo Shop 10, Habitat Centre Road', landmark: 'Near Indirapuram Habitat Centre', postalCode: '201014', coordinates: [77.3704, 28.6416], concept: 'family-friendly cuts, beard shaping and straightforward booking' },
  { key: 'faridabad-01', city: 'Faridabad', name: 'Aravali Barber & Style', slug: 'aravali-barber-and-style-faridabad', area: 'Sector 15', addressLine1: 'Demo Unit 5, Market Road', landmark: 'Near Sector 15 market', postalCode: '121007', coordinates: [77.3178, 28.4089], concept: 'careful everyday cuts and grooming with a relaxed local feel' },
  { key: 'chandigarh-01', city: 'Chandigarh', name: 'Rose Garden Cut Club', slug: 'rose-garden-cut-club-chandigarh', area: 'Sector 17', addressLine1: 'Demo Booth 14, Madhya Marg', landmark: 'Near Sector 17 Plaza', postalCode: '160017', coordinates: [76.7821, 30.7415], concept: 'precise styling and considered grooming in the heart of the city' },
  { key: 'delhi-02', city: 'Delhi', name: 'Lodi Lane Grooming Room', slug: 'lodi-lane-grooming-room-delhi', area: 'Lajpat Nagar', addressLine1: 'Demo Floor 2, Central Market Road', landmark: 'Near Lajpat Nagar Metro', postalCode: '110024', coordinates: [77.2433, 28.5677], concept: 'versatile cuts, beard maintenance and appointment-friendly service' },
  { key: 'bengaluru-02', city: 'Bengaluru', name: 'Mysore Road Modern Barber', slug: 'mysore-road-modern-barber-bengaluru', area: 'Jayanagar', addressLine1: 'Demo Shop 13, 4th Block Main Road', landmark: 'Near Jayanagar Shopping Complex', postalCode: '560011', coordinates: [77.5833, 12.925], concept: 'classic barber techniques paired with contemporary styling' },
  { key: 'hyderabad-02', city: 'Hyderabad', name: 'Charminar Cut & Craft', slug: 'charminar-cut-and-craft-hyderabad', area: 'Banjara Hills', addressLine1: 'Demo Suite 16, Road Number 3', landmark: 'Near Banjara Hills Road Number 1', postalCode: '500034', coordinates: [78.4482, 17.4126], concept: 'considered hair and beard services with a personal consultation' },
  { key: 'pune-02', city: 'Pune', name: 'Deccan Chair & Comb', slug: 'deccan-chair-and-comb-pune', area: 'Deccan Gymkhana', addressLine1: 'Demo Unit 18, Fergusson College Road', landmark: 'Near Deccan Gymkhana', postalCode: '411004', coordinates: [73.839, 18.5196], concept: 'well-paced grooming appointments and tidy, wearable styles' },
  { key: 'mumbai-02', city: 'Mumbai', name: 'Andheri West Cut Society', slug: 'andheri-west-cut-society-mumbai', area: 'Andheri West', addressLine1: 'Demo Studio 20, Lokhandwala Road', landmark: 'Near Lokhandwala Market', postalCode: '400053', coordinates: [72.8296, 19.1364], concept: 'modern cuts, clean lines and reliable appointment slots' },
];

export const DEMO_SERVICE_FIXTURES = [
  {
    slug: 'classic-haircut',
    name: 'Classic Haircut & Finish',
    category: SERVICE_CATEGORY.HAIRCUT,
    duration: 30,
    price: 29900,
    description: 'A consultation-led haircut with clean finishing. Demonstration sample price.',
  },
  {
    slug: 'beard-shape',
    name: 'Beard Shape & Detail',
    category: SERVICE_CATEGORY.BEARD,
    duration: 30,
    price: 19900,
    description: 'Beard shaping and detail work. Demonstration sample price.',
  },
  {
    slug: 'cut-wash-style',
    name: 'Haircut, Wash & Style',
    category: SERVICE_CATEGORY.HAIR_STYLING,
    duration: 45,
    price: 39900,
    description: 'A haircut with wash and styling. Demonstration sample price.',
  },
] as const;

export const DEMO_BARBER_SPECIALIZATIONS = [
  BARBER_SPECIALIZATION.HAIRCUT,
  BARBER_SPECIALIZATION.BEARD,
  BARBER_SPECIALIZATION.HAIR_STYLING,
] as const;

export function getFeature22DemoKeys(): string[] {
  return DEMO_SALONS.flatMap(({ key }) => [
    `${FEATURE22_DEMO_KEY_PREFIX}salon:${key}`,
    `${FEATURE22_DEMO_KEY_PREFIX}owner:${key}`,
    `${FEATURE22_DEMO_KEY_PREFIX}barber-user:${key}`,
    `${FEATURE22_DEMO_KEY_PREFIX}barber:${key}`,
    ...DEMO_SERVICE_FIXTURES.map(({ slug }) => `${FEATURE22_DEMO_KEY_PREFIX}service:${key}:${slug}`),
  ]);
}

export function validateFeature22DemoData(): string[] {
  const errors: string[] = [];
  const supportedCities = new Set<string>(SUPPORTED_LAUNCH_CITIES.map(({ city }) => city));
  const seenKeys = new Set<string>();
  const seenSlugs = new Set<string>();
  const coveredCities = new Set<string>();

  if (DEMO_SALONS.length !== 20) errors.push(`Expected 20 salons; found ${DEMO_SALONS.length}`);

  for (const salon of DEMO_SALONS) {
    if (!supportedCities.has(salon.city)) errors.push(`${salon.key} uses unsupported city ${salon.city}`);
    coveredCities.add(salon.city);
    if (seenKeys.has(salon.key)) errors.push(`Duplicate fixture key ${salon.key}`);
    if (seenSlugs.has(salon.slug)) errors.push(`Duplicate salon slug ${salon.slug}`);
    seenKeys.add(salon.key);
    seenSlugs.add(salon.slug);
    if (!salon.name.trim() || !salon.area.trim() || !salon.addressLine1.trim()) {
      errors.push(`${salon.key} is missing required public profile fields`);
    }
    const [longitude, latitude] = salon.coordinates;
    if (
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    ) {
      errors.push(`${salon.key} has invalid geographic coordinates`);
    }
  }

  for (const { city } of SUPPORTED_LAUNCH_CITIES) {
    if (!coveredCities.has(city)) errors.push(`No demo salon covers configured launch city ${city}`);
  }

  for (const service of DEMO_SERVICE_FIXTURES) {
    if (service.duration < 15 || service.duration > 480 || service.price < 0) {
      errors.push(`Service ${service.slug} has invalid booking values`);
    }
  }

  return errors;
}
