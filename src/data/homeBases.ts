import { AlternativePlace, HomeBase } from '@/src/types/models';
import { googleMapsSearchUrl } from '@/src/utils/maps';

export const lisbonHomeBase: HomeBase = {
  id: 'lisbon-airbnb',
  address: 'Calçada de Salvador Correia de Sá 9, Lisbon, Lisbon 1200-066',
  city: 'Lisbon',
  neighborhood: 'Bica / Misericórdia / Santa Catarina / Cais do Sodré',
  type: 'Airbnb',
  startDate: '2026-09-19',
  endDate: '2026-09-22',
  isLocked: true,
  checkOut: '11:00',
  baggageDrop: 'Early baggage drop expected; confirm timing and access with the host.',
  baggageBackups: ['Cais do Sodré station lockers', 'Lisbon Airport Terminal 1 lockers'],
  notes: [
    'Booked and fixed. Confirm check-in instructions with the host; early baggage drop is not confirmed check-in.',
    'Locker availability and suitcase capacity need checking; the listed order is the preferred backup order.',
    'On September 22, check out early for SIXT pickup; 11:00 is the latest checkout, not the planned departure.'
  ]
};

export const portoHomeBase: HomeBase = {
  id: 'porto-airbnb',
  address: 'Rua do Infante Dom Henrique 45, Porto, Porto 4050-553',
  city: 'Porto',
  neighborhood: 'Ribeira / Historic Centre',
  type: 'Airbnb',
  startDate: '2026-09-22',
  endDate: '2026-09-25',
  isLocked: true,
  checkIn: 'Self check-in',
  notes: [
    'Booked and fixed. Save the self check-in instructions offline before the late September 22 arrival.',
    'Buy grab-and-go breakfast on September 24 and keep it in the Airbnb kitchen for departure morning.',
    'Target Uber departure from this address at approximately 05:10 on September 25 for the 08:00 OPO → PMI flight.'
  ]
};

// Curated discovery collections, not mandatory itinerary stops. Google Places
// supplies live/cached ratings, counts, photos and opening status at runtime.
const nearby = (
  base: HomeBase,
  id: string,
  name: string,
  category: string,
  description: string,
  extras: Partial<AlternativePlace> = {}
): AlternativePlace => ({
  id, name, city: base.city, neighborhood: base.neighborhood, category,
  description, curated: true, status: 'active',
  distanceLabel: 'Aim for a 5–10 min walk; check the route from the Airbnb.',
  googleMapsUrl: googleMapsSearchUrl(`${name}, ${base.city}, Portugal`),
  ...extras
});

export const lisbonAroundAirbnb: AlternativePlace[] = [
  nearby(lisbonHomeBase, 'lisbon-nearby-baoba-bica', 'Baobá Café Bica', 'coffee',
    'Optional morning coffee or an afternoon pause before about 16:00; check the current menu and hours.'),
  nearby(lisbonHomeBase, 'lisbon-nearby-the-mill', 'The Mill', 'breakfast + coffee',
    'Optional breakfast or coffee near the home neighborhood; approved day stops remain unchanged.'),
  nearby(lisbonHomeBase, 'lisbon-nearby-comoba', 'COMOBÅ', 'breakfast + coffee',
    'A saved breakfast or coffee option; check seating, menu and the walking route before choosing.'),
  nearby(lisbonHomeBase, 'lisbon-nearby-hello-kristof-bica', 'Hello, Kristof Bica', 'coffee',
    'Optional Bica coffee stop; prefer a short detour and afternoon coffee before about 16:00.'),
  nearby(lisbonHomeBase, 'lisbon-nearby-manteigaria', 'Manteigaria', 'pastel de nata',
    'The Chiado option for another nata near home; this does not replace the approved arrival-day visit.', {
      googleMapsUrl: googleMapsSearchUrl('Manteigaria, Rua do Loreto, Lisbon, Portugal'),
      recommendedDishes: ['Pastel de nata', 'Espresso']
    }),
  nearby(lisbonHomeBase, 'lisbon-nearby-nova-wine-bar', 'Nova Wine Bar', 'wine bar',
    'Optional neighborhood wine stop; check current hours and availability.'),
  nearby(lisbonHomeBase, 'lisbon-nearby-groceries', 'Groceries near the Lisbon Airbnb', 'grocery',
    'Find a nearby supermarket for fruit, water and portable breakfast; verify the specific branch and opening hours.', {
      googleMapsUrl: googleMapsSearchUrl(`supermarket near ${lisbonHomeBase.address}`)
    }),
  nearby(lisbonHomeBase, 'lisbon-nearby-convenience', 'Bica / Cais do Sodré mini-markets', 'convenience store',
    'Backup for basic kitchen supplies; compare walking routes and confirm hours before heading out.', {
      googleMapsUrl: googleMapsSearchUrl(`convenience store near ${lisbonHomeBase.address}`)
    })
];

export const portoAroundAirbnb: AlternativePlace[] = [
  nearby(portoHomeBase, 'porto-nearby-brunchit-ribeira', 'Brunchit Porto Ribeira', 'breakfast + coffee',
    'Optional breakfast close to the Ribeira base; keep Do Norte and Zenith as the planned breakfasts.'),
  nearby(portoHomeBase, 'porto-nearby-my-coffee', 'My Coffee Porto', 'coffee',
    'Optional coffee while exploring Ribeira; check steps, seating and the walking route.'),
  nearby(portoHomeBase, 'porto-nearby-castro', 'Castro – Atelier de Pastéis de Nata', 'pastel de nata',
    'Saved for an extra pastry stop near home; the approved historic-day visit stays in the plan.', {
      recommendedDishes: ['Pastel de nata', 'Espresso']
    }),
  nearby(portoHomeBase, 'porto-nearby-nata-sweet-nata', 'Nata Sweet Nata Porto Ribeira', 'pastel de nata',
    'Optional pastry stop in Ribeira; check the current menu and hours.'),
  nearby(portoHomeBase, 'porto-nearby-wine-quay', 'Wine Quay Bar', 'wine bar',
    'Optional wine near the riverfront; this does not replace the Gaia tastings.'),
  nearby(portoHomeBase, 'porto-nearby-bacchus-vini', 'Bacchus Vini', 'wine bar',
    'Another saved Ribeira wine option; confirm hours and seating.'),
  nearby(portoHomeBase, 'porto-nearby-groceries', 'Groceries near the Porto Airbnb', 'grocery',
    'Buy fruit, yogurt, water and grab-and-go breakfast before the early September 25 flight.', {
      googleMapsUrl: googleMapsSearchUrl(`supermarket near ${portoHomeBase.address}`)
    }),
  nearby(portoHomeBase, 'porto-nearby-convenience', 'Ribeira convenience stores', 'convenience store',
    'Backup for breakfast and kitchen essentials; verify branch hours on September 24, not departure morning.', {
      googleMapsUrl: googleMapsSearchUrl(`convenience store near ${portoHomeBase.address}`)
    })
];
