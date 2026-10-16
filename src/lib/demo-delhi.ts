export interface DemoDelhiSalon {
  _id: string;
  name: string;
  slug: string;
  description: string;
  rating: number;
  reviewCount: number;
  startingPrice: number;
  distanceKm: number | null;
  isOpenNow: boolean;
  nextAvailableSlot: string | null;
  imageUrl: string | null;
  address: {
    city: string;
    area: string;
    state: string;
  };
}

const DELHI_SALONS: DemoDelhiSalon[] = [
  { _id: 'delhi-001', name: 'Aarav Grooming Studio', slug: 'aarav-grooming-studio', description: 'Premium grooming and beard styling for modern professionals.', rating: 4.8, reviewCount: 320, startingPrice: 450, distanceKm: 1.2, isOpenNow: true, nextAvailableSlot: 'Today, 6:30 PM', imageUrl: null, address: { city: 'Delhi', area: 'Connaught Place', state: 'Delhi' } },
  { _id: 'delhi-002', name: 'Bold & Trim Club', slug: 'bold-trim-club', description: 'Precision cuts, beard design and styling with luxury care.', rating: 4.7, reviewCount: 280, startingPrice: 520, distanceKm: 2.1, isOpenNow: true, nextAvailableSlot: 'Today, 7:00 PM', imageUrl: null, address: { city: 'Delhi', area: 'Connaught Place', state: 'Delhi' } },
  { _id: 'delhi-003', name: 'The Gentleman Room', slug: 'the-gentleman-room', description: 'Classic men’s salon with premium detailing and grooming rituals.', rating: 4.9, reviewCount: 410, startingPrice: 600, distanceKm: 3.4, isOpenNow: false, nextAvailableSlot: 'Tomorrow, 10:00 AM', imageUrl: null, address: { city: 'Delhi', area: 'Connaught Place', state: 'Delhi' } },
  { _id: 'delhi-004', name: 'Urban Edge Studio', slug: 'urban-edge-studio', description: 'Trend-driven styling and beard refinement for everyday confidence.', rating: 4.6, reviewCount: 260, startingPrice: 470, distanceKm: 4.8, isOpenNow: true, nextAvailableSlot: 'Today, 8:15 PM', imageUrl: null, address: { city: 'Delhi', area: 'Rajouri Garden', state: 'Delhi' } },
  { _id: 'delhi-005', name: 'City Cut Lounge', slug: 'city-cut-lounge', description: 'Haircut, facial and express grooming packages with smooth service.', rating: 4.5, reviewCount: 235, startingPrice: 390, distanceKm: 2.8, isOpenNow: true, nextAvailableSlot: 'Today, 5:45 PM', imageUrl: null, address: { city: 'Delhi', area: 'Rajouri Garden', state: 'Delhi' } },
  { _id: 'delhi-006', name: 'Prime Fade Studio', slug: 'prime-fade-studio', description: 'Popular for fade cuts, beard shaping and fast weekday appointments.', rating: 4.7, reviewCount: 290, startingPrice: 500, distanceKm: 3.7, isOpenNow: true, nextAvailableSlot: 'Today, 6:15 PM', imageUrl: null, address: { city: 'Delhi', area: 'Saket', state: 'Delhi' } },
  { _id: 'delhi-007', name: 'Saket Signature Salon', slug: 'saket-signature-salon', description: 'Smart grooming studio with family-friendly and premium hygiene standards.', rating: 4.8, reviewCount: 310, startingPrice: 550, distanceKm: 2.4, isOpenNow: true, nextAvailableSlot: 'Today, 7:30 PM', imageUrl: null, address: { city: 'Delhi', area: 'Saket', state: 'Delhi' } },
  { _id: 'delhi-008', name: 'Ritz Groom Lab', slug: 'ritz-groom-lab', description: 'Boutique salon for hair care, styling and beard sculpting.', rating: 4.6, reviewCount: 240, startingPrice: 430, distanceKm: 3.1, isOpenNow: false, nextAvailableSlot: 'Tomorrow, 9:30 AM', imageUrl: null, address: { city: 'Delhi', area: 'Saket', state: 'Delhi' } },
  { _id: 'delhi-009', name: 'Fresh Cut Studio', slug: 'fresh-cut-studio', description: 'Reliable grooming with expert haircut sessions and quick turnarounds.', rating: 4.5, reviewCount: 205, startingPrice: 360, distanceKm: 1.8, isOpenNow: true, nextAvailableSlot: 'Today, 6:00 PM', imageUrl: null, address: { city: 'Delhi', area: 'Dwarka', state: 'Delhi' } },
  { _id: 'delhi-010', name: 'Dwarka Groom Works', slug: 'dwarka-groom-works', description: 'Smooth service and affordable grooming for city professionals.', rating: 4.4, reviewCount: 190, startingPrice: 340, distanceKm: 2.6, isOpenNow: true, nextAvailableSlot: 'Today, 7:15 PM', imageUrl: null, address: { city: 'Delhi', area: 'Dwarka', state: 'Delhi' } },
  { _id: 'delhi-011', name: 'North Avenue Salon', slug: 'north-avenue-salon', description: 'Complete grooming for workdays, weekends and celebrations.', rating: 4.7, reviewCount: 270, startingPrice: 490, distanceKm: 3.9, isOpenNow: true, nextAvailableSlot: 'Today, 8:00 PM', imageUrl: null, address: { city: 'Delhi', area: 'Karol Bagh', state: 'Delhi' } },
  { _id: 'delhi-012', name: 'Karol Bagh Groom Co.', slug: 'karol-bagh-groom-co', description: 'Style-focused salon with beard detailing and face care.', rating: 4.5, reviewCount: 220, startingPrice: 410, distanceKm: 2.9, isOpenNow: false, nextAvailableSlot: 'Tomorrow, 11:00 AM', imageUrl: null, address: { city: 'Delhi', area: 'Karol Bagh', state: 'Delhi' } },
  { _id: 'delhi-013', name: 'Blaze Barber Lounge', slug: 'blaze-barber-lounge', description: 'Comfortable and polished barber lounge with expert hair styling.', rating: 4.8, reviewCount: 340, startingPrice: 560, distanceKm: 2.5, isOpenNow: true, nextAvailableSlot: 'Today, 6:45 PM', imageUrl: null, address: { city: 'Delhi', area: 'Lajpat Nagar', state: 'Delhi' } },
  { _id: 'delhi-014', name: 'Lajpat Groom House', slug: 'lajpat-groom-house', description: 'Affordable premium grooming for work and weekend plans.', rating: 4.6, reviewCount: 260, startingPrice: 460, distanceKm: 3.0, isOpenNow: true, nextAvailableSlot: 'Today, 7:20 PM', imageUrl: null, address: { city: 'Delhi', area: 'Lajpat Nagar', state: 'Delhi' } },
  { _id: 'delhi-015', name: 'Pride Cuts & Care', slug: 'pride-cuts-care', description: 'Hair, beard and face grooming studio with consistent styling.', rating: 4.7, reviewCount: 300, startingPrice: 520, distanceKm: 3.6, isOpenNow: true, nextAvailableSlot: 'Today, 5:30 PM', imageUrl: null, address: { city: 'Delhi', area: 'South Extension', state: 'Delhi' } },
  { _id: 'delhi-016', name: 'South X Grooming', slug: 'south-x-grooming', description: 'Clean trims and modern finish with a premium grooming experience.', rating: 4.8, reviewCount: 330, startingPrice: 610, distanceKm: 2.3, isOpenNow: true, nextAvailableSlot: 'Today, 8:30 PM', imageUrl: null, address: { city: 'Delhi', area: 'South Extension', state: 'Delhi' } },
  { _id: 'delhi-017', name: 'Shine & Shape', slug: 'shine-shape', description: 'Trusted for beard styling, fade cuts and crisp finishing touches.', rating: 4.5, reviewCount: 220, startingPrice: 390, distanceKm: 4.2, isOpenNow: false, nextAvailableSlot: 'Tomorrow, 9:00 AM', imageUrl: null, address: { city: 'Delhi', area: 'Pitampura', state: 'Delhi' } },
  { _id: 'delhi-018', name: 'Pitampura Groom Spot', slug: 'pitampura-groom-spot', description: 'Popular neighborhood salon for hair restoration, styling and care.', rating: 4.6, reviewCount: 250, startingPrice: 430, distanceKm: 4.8, isOpenNow: true, nextAvailableSlot: 'Today, 6:00 PM', imageUrl: null, address: { city: 'Delhi', area: 'Pitampura', state: 'Delhi' } },
  { _id: 'delhi-019', name: 'Classy Fade House', slug: 'classy-fade-house', description: 'Modern grooming destination with custom beard and haircut packages.', rating: 4.7, reviewCount: 290, startingPrice: 480, distanceKm: 5.0, isOpenNow: true, nextAvailableSlot: 'Today, 7:45 PM', imageUrl: null, address: { city: 'Delhi', area: 'Janakpuri', state: 'Delhi' } },
  { _id: 'delhi-020', name: 'Janakpuri Groom Care', slug: 'janakpuri-groom-care', description: 'Relaxed ambience and dependable grooming for busy schedules.', rating: 4.5, reviewCount: 210, startingPrice: 360, distanceKm: 2.9, isOpenNow: true, nextAvailableSlot: 'Today, 6:30 PM', imageUrl: null, address: { city: 'Delhi', area: 'Janakpuri', state: 'Delhi' } },
  { _id: 'delhi-021', name: 'Risers Barber Studio', slug: 'risers-barber-studio', description: 'High-demand salon for precision haircut and beard shape work.', rating: 4.9, reviewCount: 420, startingPrice: 650, distanceKm: 2.0, isOpenNow: true, nextAvailableSlot: 'Today, 7:00 PM', imageUrl: null, address: { city: 'Delhi', area: 'Vasant Kunj', state: 'Delhi' } },
  { _id: 'delhi-022', name: 'Vasant Kunj Groom Hub', slug: 'vasant-kunj-groom-hub', description: 'Luxury grooming styling for modern lifestyles and special events.', rating: 4.7, reviewCount: 275, startingPrice: 540, distanceKm: 3.3, isOpenNow: true, nextAvailableSlot: 'Today, 8:15 PM', imageUrl: null, address: { city: 'Delhi', area: 'Vasant Kunj', state: 'Delhi' } },
  { _id: 'delhi-023', name: 'Nucleus Salon', slug: 'nucleus-salon', description: 'Artist-led approach to haircuts, beard shaping and subtle color works.', rating: 4.6, reviewCount: 240, startingPrice: 470, distanceKm: 2.7, isOpenNow: true, nextAvailableSlot: 'Today, 6:15 PM', imageUrl: null, address: { city: 'Delhi', area: 'Greater Kailash', state: 'Delhi' } },
  { _id: 'delhi-024', name: 'Greater Kailash Groom', slug: 'greater-kailash-groom', description: 'Premium salon focused on aesthetic haircut and bespoke styling.', rating: 4.8, reviewCount: 320, startingPrice: 590, distanceKm: 3.2, isOpenNow: false, nextAvailableSlot: 'Tomorrow, 10:30 AM', imageUrl: null, address: { city: 'Delhi', area: 'Greater Kailash', state: 'Delhi' } },
  { _id: 'delhi-025', name: 'Ashok Vihar Style Lounge', slug: 'ashok-vihar-style-lounge', description: 'Classic and modern cuts with polished beard finish and care.', rating: 4.5, reviewCount: 210, startingPrice: 420, distanceKm: 4.0, isOpenNow: true, nextAvailableSlot: 'Today, 6:45 PM', imageUrl: null, address: { city: 'Delhi', area: 'Ashok Vihar', state: 'Delhi' } },
  { _id: 'delhi-026', name: 'Ashok Vihar Groom Room', slug: 'ashok-vihar-groom-room', description: 'Reputation for clean finishes and a calm, well-managed salon experience.', rating: 4.6, reviewCount: 250, startingPrice: 440, distanceKm: 5.4, isOpenNow: true, nextAvailableSlot: 'Today, 7:15 PM', imageUrl: null, address: { city: 'Delhi', area: 'Ashok Vihar', state: 'Delhi' } },
  { _id: 'delhi-027', name: 'Model Town Fresh Cut', slug: 'model-town-fresh-cut', description: 'Friendly grooming studio with expert cuts and regular maintenance plans.', rating: 4.4, reviewCount: 198, startingPrice: 350, distanceKm: 4.7, isOpenNow: true, nextAvailableSlot: 'Today, 5:45 PM', imageUrl: null, address: { city: 'Delhi', area: 'Model Town', state: 'Delhi' } },
  { _id: 'delhi-028', name: 'Model Town Barber House', slug: 'model-town-barber-house', description: 'Reliable hair and beard grooming by experienced local stylists.', rating: 4.5, reviewCount: 218, startingPrice: 380, distanceKm: 3.7, isOpenNow: false, nextAvailableSlot: 'Tomorrow, 9:15 AM', imageUrl: null, address: { city: 'Delhi', area: 'Model Town', state: 'Delhi' } },
  { _id: 'delhi-029', name: 'Diva Groom Lab', slug: 'diva-groom-lab', description: 'Men’s grooming done with precision, comfort and modern finishing.', rating: 4.7, reviewCount: 270, startingPrice: 500, distanceKm: 3.1, isOpenNow: true, nextAvailableSlot: 'Today, 6:00 PM', imageUrl: null, address: { city: 'Delhi', area: 'Patel Nagar', state: 'Delhi' } },
  { _id: 'delhi-030', name: 'Patel Nagar Style Core', slug: 'patel-nagar-style-core', description: 'Personalized styling and beard care with premium attention to detail.', rating: 4.6, reviewCount: 240, startingPrice: 450, distanceKm: 2.8, isOpenNow: true, nextAvailableSlot: 'Today, 7:45 PM', imageUrl: null, address: { city: 'Delhi', area: 'Patel Nagar', state: 'Delhi' } },
  { _id: 'delhi-031', name: 'Uttam Edge Salon', slug: 'uttam-edge-salon', description: 'Popular neighborhood salon for hair styling and beard detailing.', rating: 4.4, reviewCount: 185, startingPrice: 330, distanceKm: 2.4, isOpenNow: true, nextAvailableSlot: 'Today, 6:30 PM', imageUrl: null, address: { city: 'Delhi', area: 'Uttam Nagar', state: 'Delhi' } },
  { _id: 'delhi-032', name: 'Uttam Groom Studio', slug: 'uttam-groom-studio', description: 'Fast, neat and affordable grooming with warm service.', rating: 4.5, reviewCount: 220, startingPrice: 370, distanceKm: 3.0, isOpenNow: false, nextAvailableSlot: 'Tomorrow, 8:30 AM', imageUrl: null, address: { city: 'Delhi', area: 'Uttam Nagar', state: 'Delhi' } },
  { _id: 'delhi-033', name: 'Shahdara Trim House', slug: 'shahdara-trim-house', description: 'Comfortable salon experience for haircuts, beard shapes and care.', rating: 4.3, reviewCount: 176, startingPrice: 315, distanceKm: 5.2, isOpenNow: true, nextAvailableSlot: 'Today, 5:15 PM', imageUrl: null, address: { city: 'Delhi', area: 'Shahdara', state: 'Delhi' } },
  { _id: 'delhi-034', name: 'Shahdara Groom Point', slug: 'shahdara-groom-point', description: 'Convenient local spot for clean and sharp grooming looks.', rating: 4.4, reviewCount: 205, startingPrice: 360, distanceKm: 4.9, isOpenNow: true, nextAvailableSlot: 'Today, 6:45 PM', imageUrl: null, address: { city: 'Delhi', area: 'Shahdara', state: 'Delhi' } },
  { _id: 'delhi-035', name: 'Preet Vihar Style Club', slug: 'preet-vihar-style-club', description: 'Precision grooming studio with premium styling and beard finishing.', rating: 4.7, reviewCount: 280, startingPrice: 500, distanceKm: 3.8, isOpenNow: true, nextAvailableSlot: 'Today, 7:00 PM', imageUrl: null, address: { city: 'Delhi', area: 'Preet Vihar', state: 'Delhi' } },
  { _id: 'delhi-036', name: 'Preet Vihar Fade Lab', slug: 'preet-vihar-fade-lab', description: 'Sharp fade cuts, beard trims and polished finishing touches.', rating: 4.6, reviewCount: 240, startingPrice: 470, distanceKm: 4.5, isOpenNow: true, nextAvailableSlot: 'Today, 6:15 PM', imageUrl: null, address: { city: 'Delhi', area: 'Preet Vihar', state: 'Delhi' } },
  { _id: 'delhi-037', name: 'Punjabi Bagh Groom Express', slug: 'punjabi-bagh-groom-express', description: 'Fast service for premium haircuts and beard grooming essentials.', rating: 4.5, reviewCount: 210, startingPrice: 390, distanceKm: 2.7, isOpenNow: true, nextAvailableSlot: 'Today, 7:15 PM', imageUrl: null, address: { city: 'Delhi', area: 'Punjabi Bagh', state: 'Delhi' } },
  { _id: 'delhi-038', name: 'Punjabi Bagh Fresh Trim', slug: 'punjabi-bagh-fresh-trim', description: 'Clean styling, quality beard shaping and a polished finish.', rating: 4.6, reviewCount: 235, startingPrice: 410, distanceKm: 3.4, isOpenNow: false, nextAvailableSlot: 'Tomorrow, 9:45 AM', imageUrl: null, address: { city: 'Delhi', area: 'Punjabi Bagh', state: 'Delhi' } },
  { _id: 'delhi-039', name: 'Mayur Vihar Fresh Look', slug: 'mayur-vihar-fresh-look', description: 'Professional grooming with modern cuts and beard styling packages.', rating: 4.5, reviewCount: 230, startingPrice: 420, distanceKm: 3.6, isOpenNow: true, nextAvailableSlot: 'Today, 6:30 PM', imageUrl: null, address: { city: 'Delhi', area: 'Mayur Vihar', state: 'Delhi' } },
  { _id: 'delhi-040', name: 'Mayur Vihar Trim Room', slug: 'mayur-vihar-trim-room', description: 'Balanced grooming services for professionals and students alike.', rating: 4.4, reviewCount: 200, startingPrice: 360, distanceKm: 4.1, isOpenNow: true, nextAvailableSlot: 'Today, 6:15 PM', imageUrl: null, address: { city: 'Delhi', area: 'Mayur Vihar', state: 'Delhi' } },
  { _id: 'delhi-041', name: 'Anand Vihar Groom Society', slug: 'anand-vihar-groom-society', description: 'Reliable grooming studio with premium urban styling routines.', rating: 4.6, reviewCount: 250, startingPrice: 440, distanceKm: 5.1, isOpenNow: true, nextAvailableSlot: 'Today, 7:30 PM', imageUrl: null, address: { city: 'Delhi', area: 'Anand Vihar', state: 'Delhi' } },
  { _id: 'delhi-042', name: 'Anand Vihar Cut Club', slug: 'anand-vihar-cut-club', description: 'Confident styling and consistent results for every occasion.', rating: 4.5, reviewCount: 218, startingPrice: 395, distanceKm: 4.0, isOpenNow: false, nextAvailableSlot: 'Tomorrow, 10:15 AM', imageUrl: null, address: { city: 'Delhi', area: 'Anand Vihar', state: 'Delhi' } },
  { _id: 'delhi-043', name: 'Narela Groom Fine', slug: 'narela-groom-fine', description: 'Premium neighborhood salon focused on beard grooming and styling.', rating: 4.4, reviewCount: 180, startingPrice: 330, distanceKm: 6.4, isOpenNow: true, nextAvailableSlot: 'Today, 6:45 PM', imageUrl: null, address: { city: 'Delhi', area: 'Narela', state: 'Delhi' } },
  { _id: 'delhi-044', name: 'Narela Style House', slug: 'narela-style-house', description: 'Comfort-first grooming with sharp finishing and restorative care.', rating: 4.5, reviewCount: 210, startingPrice: 370, distanceKm: 6.8, isOpenNow: true, nextAvailableSlot: 'Today, 7:00 PM', imageUrl: null, address: { city: 'Delhi', area: 'Narela', state: 'Delhi' } },
  { _id: 'delhi-045', name: 'Najafgarh Signature Cut', slug: 'najafgarh-signature-cut', description: 'Modern cuts and beard design in a premium local setting.', rating: 4.6, reviewCount: 230, startingPrice: 410, distanceKm: 7.5, isOpenNow: true, nextAvailableSlot: 'Today, 7:20 PM', imageUrl: null, address: { city: 'Delhi', area: 'Najafgarh', state: 'Delhi' } },
  { _id: 'delhi-046', name: 'Najafgarh Groom Box', slug: 'najafgarh-groom-box', description: 'Simple, stylish and reliable grooming for everyday confidence.', rating: 4.4, reviewCount: 188, startingPrice: 340, distanceKm: 7.0, isOpenNow: false, nextAvailableSlot: 'Tomorrow, 9:30 AM', imageUrl: null, address: { city: 'Delhi', area: 'Najafgarh', state: 'Delhi' } },
  { _id: 'delhi-047', name: 'Wazirpur Groom Studio', slug: 'wazirpur-groom-studio', description: 'Expert hair and beard styling with premium attention to detail.', rating: 4.5, reviewCount: 220, startingPrice: 410, distanceKm: 5.8, isOpenNow: true, nextAvailableSlot: 'Today, 6:00 PM', imageUrl: null, address: { city: 'Delhi', area: 'Wazirpur', state: 'Delhi' } },
  { _id: 'delhi-048', name: 'Wazirpur Fresh Cut', slug: 'wazirpur-fresh-cut', description: 'Popular local salon with consistent quality and quick appointments.', rating: 4.4, reviewCount: 205, startingPrice: 360, distanceKm: 5.5, isOpenNow: true, nextAvailableSlot: 'Today, 7:15 PM', imageUrl: null, address: { city: 'Delhi', area: 'Wazirpur', state: 'Delhi' } },
  { _id: 'delhi-049', name: 'Rohini Beard & Cut', slug: 'rohini-beard-cut', description: 'Neighborhood grooming boutique with polished styling and enhancement.', rating: 4.7, reviewCount: 260, startingPrice: 440, distanceKm: 4.6, isOpenNow: true, nextAvailableSlot: 'Today, 8:00 PM', imageUrl: null, address: { city: 'Delhi', area: 'Rohini', state: 'Delhi' } },
  { _id: 'delhi-050', name: 'Rohini Groom Avenue', slug: 'rohini-groom-avenue', description: 'Modern salon care for haircuts, beard styling and everyday confidence.', rating: 4.6, reviewCount: 245, startingPrice: 400, distanceKm: 4.4, isOpenNow: false, nextAvailableSlot: 'Tomorrow, 9:00 AM', imageUrl: null, address: { city: 'Delhi', area: 'Rohini', state: 'Delhi' } },
];

export function getDemoDelhiSalons({ location, q, limit = 20 }: { location?: string; q?: string; limit?: number }): DemoDelhiSalon[] {
  const normalizedLocation = (location || '').trim().toLowerCase();
  const normalizedQuery = (q || '').trim().toLowerCase();

  let filtered = DELHI_SALONS;

  if (normalizedLocation && normalizedLocation !== 'delhi') {
    filtered = filtered.filter((salon) => {
      const locationTokens = [salon.address.city, salon.address.area, salon.address.state]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return locationTokens.includes(normalizedLocation);
    });
  }

  if (normalizedQuery) {
    filtered = filtered.filter((salon) => {
      const haystack = `${salon.name} ${salon.address.area} ${salon.description}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }

  if (filtered.length === 0) {
    filtered = DELHI_SALONS;
  }

  return filtered.slice(0, limit);
}
