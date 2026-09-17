import type { CoffeeStopProfile, RouteMode } from '@/src/types/models';
import { googleMapsSearchUrl } from '@/src/utils/maps';
import { mallorcaCoffeeStops } from './mallorca';

// These are inherited historical review snapshots, not current Google results.
// Do not advance this date when editing the curated recommendations.
const fetchedAt = '2026-06-01T12:00:00.000Z';

export interface CoffeeRecommendation extends CoffeeStopProfile {
  address?: string;
  aliases?: string[];
  preferred?: boolean;
  routeMode?: RouteMode;
}

export interface CoffeeRouteHint {
  // An estimate is shown only while the actual preceding stop still matches.
  // Home anchors use the booked Airbnb, never a legacy hotel.
  from: string[];
  walkingMinutes?: readonly [number, number];
  detourMinutes?: readonly [number, number];
  note?: string;
}

export const coffeeHomeAddresses = {
  Lisbon: 'Calçada de Salvador Correia de Sá 9, Lisbon, Lisbon 1200-066',
  Porto: 'Rua do Infante Dom Henrique 45, Porto, Porto 4050-553'
};

// Rough planning allowances, not measured Google Routes results. Missing values
// deliberately mean unknown; a changed origin invalidates the old estimate.
export const coffeeRouteHints: Record<string, CoffeeRouteHint> = {
  'baoba-bica': { from: ['home:Lisbon'], walkingMinutes: [3, 6], detourMinutes: [5, 10] },
  'comoba-bica': { from: ['home:Lisbon'], walkingMinutes: [3, 7], detourMinutes: [5, 10] },
  'hello-kristof-bica': { from: ['home:Lisbon'], walkingMinutes: [7, 10], detourMinutes: [10, 20] },
  'the-mill': { from: ['home:Lisbon'], walkingMinutes: [5, 10], detourMinutes: [10, 20] },
  'dear-breakfast-bica': {
    from: ['home:Lisbon'], walkingMinutes: [5, 10], detourMinutes: [0, 5],
    note: 'Preferred Sintra breakfast, not an extra meal if already planned. The café website lists an 08:00 opening (checked Sept 10, 2026); confirm hours and allow time for breakfast plus the trip to Rossio. Do not assume a 07:30 opening.'
  },
  'baoba-departure': {
    from: ['home:Lisbon'], walkingMinutes: [3, 6], detourMinutes: [5, 10],
    note: 'Optional takeaway only if open and time allows. Keep the airport SIXT pickup around 09:15–10:00; breakfast at the Airbnb is the simplest fallback.'
  },
  dramatico: {
    from: ['home:Lisbon'], walkingMinutes: [20, 30], detourMinutes: [30, 45],
    note: 'Príncipe Real is a destination detour from Bica. The nearby Airbnb cafés take priority.'
  },
  'folks-se': { from: ['Praça do Comércio'], walkingMinutes: [10, 15], note: 'Fits best while already heading toward Sé / Alfama; do not rush the approved stops for coffee.' },
  'copenhagen-alfama': { from: [], note: 'Alfama backup only. Confirm the branch and walk in Maps.' },
  'cafe-saudade': { from: [], note: 'Station-area Sintra backup if time permits. Keep Dear Breakfast Bica as the preferred breakfast and preserve palace entry times.' },
  buna: { from: [], note: 'Santos option after breakfast; check the actual previous-stop route before adding.' },
  'copenhagen-alcantara': { from: ['LX Factory'], walkingMinutes: [5, 10], detourMinutes: [10, 20] },
  torra: { from: [], note: 'Optional roaster detour, not a required stop. Check the branch and onward route in Maps.' },
  'cafe-sao': { from: [], note: 'Best if already near Jardim da Estrela. If you arrive after 16:00, favor pastry, tea, or decaf; confirm availability.' },
  'capinha-obidos': { from: ['Óbidos'], walkingMinutes: [5, 10], detourMinutes: [5, 10], note: 'Within the walled-town walk; leave the car outside the walls.' },
  'colour-beans': { from: [], note: 'Optional Nazaré coffee after lunch, preferably before 16:00. The walk from Pangeia / Sítio is not verified; check hills, transfer time, and airport-return buffer.' },
  'so-coffee': { from: [], note: 'Choose the central Porto branch that fits the current Bolhão–São Bento route; walking time is not verified.' },
  'my-coffee-porto': { from: ['Ribeira', 'home:Porto'], walkingMinutes: [5, 10], detourMinutes: [10, 20], note: 'A riverside option near the Porto Airbnb; allow for steps and limited space.' },
  '7g-roaster': { from: ['Dom Luís I Bridge — lower deck to Gaia'], walkingMinutes: [5, 10], detourMinutes: [10, 20], note: 'Optional Gaia coffee after the lower bridge deck, before the tastings. Skip if time or caffeine feels tight.' },
  tavi: { from: ['Foz promenade', 'Passeio Alegre'], walkingMinutes: [10, 20], detourMinutes: [5, 10], note: 'Optional coffee / pastry along the Foz walk; not a walk from the Ribeira Airbnb. Keep Zenith breakfast and O Gaveto lunch.' },
  booinga: { from: [], note: 'Optional specialty coffee in Matosinhos after O Gaveto. Check the branch, walk, and hours before making a detour.' },
  combi: { from: [], note: 'A destination detour back in central Porto, not a nearby Matosinhos café. Check transfer time; skip rather than displace the coastal plan.' }
};

const coffee = (
  id: string,
  dayId: string,
  city: string,
  name: string,
  suggestedTime: string,
  options: Omit<CoffeeRecommendation, 'id' | 'dayId' | 'city' | 'name' | 'suggestedTime' | 'googleMapsUrl'>
): CoffeeRecommendation => ({
  id,
  dayId,
  city,
  name,
  suggestedTime,
  googleMapsUrl: googleMapsSearchUrl(`${name}, ${options.address ?? city}, Portugal`),
  ...options
});

export const coffeeStops: CoffeeRecommendation[] = [
  // Branch addresses: baobacafe.pt/en/pages/where-to-find-us,
  // comoba-lisboa.com, hellokristof.com/locations (checked Sept 10, 2026).
  coffee('baoba-bica', 'day-1', 'Lisbon', 'Baobá Café Bica', '13:00', {
    address: 'Rua de São Paulo 256–258, Lisbon',
    description: 'An optional first coffee close to the Bica Airbnb after dropping bags; keep the approved nata and sightseeing stops.',
    style: ['specialty', 'roaster'], routeRole: 'on-route',
    recommendedDrinks: ['Espresso', 'Ask for the current filter coffee'], recommendedPastries: [],
    morningRecommended: false, afternoonRecommended: true, latestSuggestedCoffeeTime: '15:45',
    badges: ['around the Airbnb', 'roaster']
  }),
  coffee('comoba-bica', 'day-1', 'Lisbon', 'COMOBÅ', '13:00', {
    address: 'Rua da Boavista 90, Lisbon',
    description: 'Coffee or matcha near the Airbnb before the riverfront walk. An optional choice, not another required meal.',
    style: ['specialty'], routeRole: 'on-route',
    recommendedDrinks: ['Flat white', 'V60'], recommendedPastries: ['Cinnamon roll', 'Banana bread'],
    // Published menu: https://www.comoba-lisboa.com/menu (Sept 10, 2026).
    uniqueDrink: 'Mont Blanc cold brew — menu may change',
    morningRecommended: false, afternoonRecommended: true, latestSuggestedCoffeeTime: '15:45',
    badges: ['around the Airbnb', 'trendy']
  }),
  coffee('dramatico', 'day-1', 'Lisbon', 'Dramático', '13:15', {
    description: 'Tiny, minimalist, coffee-first stop in Príncipe Real. Optional destination detour from the Bica Airbnb, not the default nearby choice.',
    style: ['specialty'], routeRole: 'destination-detour',
    recommendedDrinks: ['Flat white', 'Filter coffee', 'Espresso'],
    recommendedPastries: ['Banana bread', 'Cookies'],
    morningRecommended: false, afternoonRecommended: true, latestSuggestedCoffeeTime: '15:30',
    seatingType: 'limited', badges: ['outstanding coffee', 'trendy', 'limited seating'],
    reviewSnapshot: { rating: 4.9, count: 445, source: 'Google', fetchedAt }
  }),
  coffee('folks-se', 'day-1', 'Lisbon', 'The Folks Sé', '15:15', {
    description: 'Afternoon specialty option beside the Sé and Alfama route.',
    style: ['specialty'], routeRole: 'on-route',
    recommendedDrinks: ['Espresso', 'Coconut latte', 'Pistachio latte'],
    uniqueDrink: 'Pistachio latte', recommendedPastries: ['Warm cinnamon roll'],
    morningRecommended: false, afternoonRecommended: true, latestSuggestedCoffeeTime: '15:30',
    seatingType: 'comfortable', badges: ['trendy', 'route perfect']
  }),
  coffee('copenhagen-alfama', 'day-1', 'Lisbon', 'Copenhagen Coffee Lab Alfama', '15:15', {
    description: 'Calmer, bakery-heavy Alfama backup with more room to sit.',
    style: ['specialty', 'bakery'], routeRole: 'backup',
    recommendedDrinks: ['V60', 'Filter coffee', 'Cappuccino'],
    recommendedPastries: ['Cinnamon roll', 'Focaccia', 'Cake'],
    morningRecommended: false, afternoonRecommended: true, latestSuggestedCoffeeTime: '15:30',
    seatingType: 'comfortable', badges: ['staple', 'coffee and bakery']
  }),
  coffee('dear-breakfast-bica', 'day-2', 'Lisbon', 'Dear Breakfast Bica', '08:00', {
    address: 'Rua das Gaivotas 17, Lisbon', aliases: ['Dear Breakfast'], preferred: true,
    description: 'Preferred breakfast near the Bica Airbnb on the Sintra morning. If already in the itinerary, enjoy coffee with that breakfast rather than adding a duplicate.',
    style: ['specialty'], routeRole: 'on-route',
    recommendedDrinks: ['Coffee', 'Fresh juice'], recommendedPastries: [],
    morningRecommended: true, afternoonRecommended: false, seatingType: 'comfortable',
    badges: ['preferred Sintra morning', 'trendy']
  }),
  coffee('cafe-saudade', 'day-2', 'Sintra', 'Café Saudade', '09:30', {
    description: 'Atmospheric historic rooms near Sintra station; useful before the hills or on the return.',
    style: ['traditional', 'bakery'], routeRole: 'backup',
    recommendedDrinks: ['Coffee', 'Tea', 'Lemonade'],
    recommendedPastries: ['Oversized scone', 'Cakes', 'Local bakery goods'],
    morningRecommended: true, afternoonRecommended: true, latestSuggestedCoffeeTime: '15:30',
    seatingType: 'comfortable', badges: ['local staple', 'pastry friendly']
  }),
  coffee('the-mill', 'day-3', 'Lisbon', 'The Mill', '08:00', {
    description: 'An optional neighborhood coffee before the approved breakfast and west-Lisbon route. Confirm the current menu and opening time in Maps.',
    style: ['specialty'], routeRole: 'on-route',
    recommendedDrinks: ['Ask for the house coffee'], recommendedPastries: [],
    morningRecommended: true, afternoonRecommended: false,
    badges: ['around the Airbnb']
  }),
  coffee('hello-kristof-bica', 'day-3', 'Lisbon', 'Hello, Kristof Bica', '08:00', {
    address: 'Rua do Poço dos Negros 103, Lisbon', aliases: ['Hello Kristof Bica'],
    description: 'A small Bica coffee room within the Airbnb neighborhood. Optional coffee only; keep the approved breakfast.',
    style: ['specialty'], routeRole: 'on-route',
    recommendedDrinks: ['Ask for the house-roasted coffee'], recommendedPastries: [],
    morningRecommended: true, afternoonRecommended: false, seatingType: 'limited',
    badges: ['around the Airbnb']
  }),
  coffee('buna', 'day-3', 'Lisbon', 'Buna', '10:15', {
    description: 'Small Santos neighborhood café known for careful specialty coffee.',
    style: ['specialty'], routeRole: 'on-route',
    recommendedDrinks: ['Flat white', 'Batch brew', 'Cappuccino', 'Nitro cold brew'],
    uniqueDrink: 'Nitro cold brew', recommendedPastries: ['Croissant'],
    morningRecommended: true, afternoonRecommended: false, seatingType: 'limited',
    badges: ['outstanding coffee', 'local feel'],
    reviewSnapshot: { rating: 4.8, count: 336, source: 'Google', fetchedAt }
  }),
  coffee('copenhagen-alcantara', 'day-3', 'Lisbon', 'Copenhagen Coffee Lab Alcântara', '11:15', {
    description: 'Reliable coffee-and-bakery stop with substantial seating near LX Factory.',
    style: ['specialty', 'bakery'], routeRole: 'on-route',
    recommendedDrinks: ['Espresso', 'Filter coffee', 'Cappuccino'],
    recommendedPastries: ['Cinnamon roll', 'Croissant', 'Bread', 'Cake'],
    morningRecommended: true, afternoonRecommended: false, seatingType: 'comfortable',
    badges: ['reliable', 'bakery strong']
  }),
  coffee('torra', 'day-3', 'Lisbon', 'Torra Roasting & Coffee', '11:15', {
    description: 'House-roasted destination-quality alternate near the LX Factory route.',
    style: ['specialty', 'roaster'], routeRole: 'destination-detour',
    recommendedDrinks: ['House espresso', 'Filter coffee'],
    recommendedPastries: ['Fresh pastry', 'Breakfast items'],
    morningRecommended: true, afternoonRecommended: false, seatingType: 'comfortable',
    badges: ['roaster', 'outstanding detour']
  }),
  coffee('cafe-sao', 'day-3', 'Lisbon', 'Café São', '15:15', {
    description: 'Pastry-forward Estrela option pairing coffee with a French-inspired pastry program.',
    style: ['specialty', 'pastry-destination'], routeRole: 'short-detour',
    recommendedDrinks: ['Latte', 'Cappuccino'],
    recommendedPastries: ['Croissant', 'Paris-Brest', 'Laminated pastry'],
    morningRecommended: false, afternoonRecommended: true, latestSuggestedCoffeeTime: '15:30',
    seatingType: 'comfortable', badges: ['pastry destination', 'trendy']
  }),
  coffee('baoba-departure', 'porto-day-1', 'Lisbon', 'Baobá Café Bica', '08:00', {
    address: 'Rua de São Paulo 256–258, Lisbon',
    description: 'Optional coffee near the Lisbon Airbnb before airport pickup. Skip if there is a queue; use the Airbnb kitchen for a simple breakfast.',
    style: ['specialty', 'roaster'], routeRole: 'on-route',
    recommendedDrinks: ['Espresso', 'Ask for takeaway coffee'], recommendedPastries: [],
    morningRecommended: true, afternoonRecommended: false,
    badges: ['around the Airbnb', 'portable']
  }),
  coffee('capinha-obidos', 'porto-day-1', 'Óbidos', 'Capinha d’Óbidos', '12:30', {
    description: 'Traditional bakery stop woven naturally into the walled-town walk.',
    style: ['traditional', 'pastry-destination'], routeRole: 'on-route',
    recommendedDrinks: ['Portuguese espresso'],
    recommendedPastries: ['Traditional Óbidos bakery items'],
    morningRecommended: false, afternoonRecommended: true, latestSuggestedCoffeeTime: '15:45', seatingType: 'takeaway',
    badges: ['traditional pastry', 'cultural stop']
  }),
  coffee('colour-beans', 'porto-day-1', 'Nazaré', 'Colour Beans', '15:15', {
    description: 'Optional specialty stop after lunch if the Nazaré route and airport-return buffer allow.',
    style: ['specialty'], routeRole: 'short-detour',
    recommendedDrinks: ['Espresso', 'Filter coffee', 'Cold brew', 'Decaf'],
    recommendedPastries: [], morningRecommended: false, afternoonRecommended: true,
    latestSuggestedCoffeeTime: '15:45', decafAvailable: true, seatingType: 'limited',
    badges: ['trendy', 'confirm route']
  }),
  coffee('so-coffee', 'porto-day-2', 'Porto', 'SO Coffee Roasters', '11:20', {
    description: 'Central Porto specialty staple for choosing a bean and brew method.',
    style: ['specialty', 'roaster'], routeRole: 'short-detour',
    recommendedDrinks: ['V60', 'Espresso', 'Flat white'],
    recommendedPastries: ['Small pastry selection'],
    morningRecommended: true, afternoonRecommended: false, seatingType: 'limited',
    badges: ['outstanding coffee', 'roaster', 'staple'],
    reviewSnapshot: { rating: 4.7, count: 1100, source: 'Google', fetchedAt }
  }),
  coffee('my-coffee-porto', 'porto-day-2', 'Porto', 'My Coffee Porto', '15:10', {
    description: 'Small scenic caffeine break compatible with Ribeira and the lower bridge deck.',
    style: ['specialty'], routeRole: 'on-route',
    recommendedDrinks: ['Flat white', 'Macchiato'],
    recommendedPastries: ['Croissant', 'Toast'],
    morningRecommended: false, afternoonRecommended: true, latestSuggestedCoffeeTime: '15:45',
    seatingType: 'terrace', badges: ['Douro view', 'popular', 'route perfect'],
    reviewSnapshot: { rating: 4.6, count: 1800, source: 'Google', fetchedAt }
  }),
  coffee('7g-roaster', 'porto-day-2', 'Gaia', '7g Roaster', '15:40', {
    address: 'Rua de França 52, Vila Nova de Gaia',
    description: 'Optional destination coffee before the Port tastings; skip if the afternoon feels too drink-heavy. Keep both approved tastings.',
    style: ['specialty', 'roaster'], routeRole: 'short-detour',
    recommendedDrinks: ['V60', 'Coffee tasting flight', 'Espresso'],
    recommendedPastries: ['Cinnamon roll', 'Hazelnut-chocolate puff pastry'],
    morningRecommended: false, afternoonRecommended: true, latestSuggestedCoffeeTime: '15:45',
    seatingType: 'comfortable', badges: ['destination coffee', 'roaster'],
    reviewSnapshot: { rating: 4.5, count: 588, source: 'Tripadvisor', fetchedAt }
  }),
  coffee('tavi', 'porto-day-3', 'Porto', 'Tavi', '10:45', {
    description: 'Optional historic Foz pastry room with an Atlantic-facing lounge and terrace. Complements the promenade without replacing breakfast or lunch.',
    style: ['traditional', 'bakery', 'pastry-destination'], routeRole: 'on-route',
    recommendedDrinks: ['Portuguese espresso', 'Cappuccino'],
    recommendedPastries: ['Portuguese pastry selection'],
    morningRecommended: true, afternoonRecommended: false, seatingType: 'terrace',
    badges: ['historic staple', 'ocean view', 'pastry strong'],
    reviewSnapshot: { rating: 4.3, count: 3500, source: 'Google', fetchedAt }
  }),
  coffee('booinga', 'porto-day-3', 'Matosinhos', 'Booínga Coffee Roasters', '15:15', {
    description: 'Optional Matosinhos roaster after the seafood lunch; confirm walking time and hours before adding.',
    style: ['specialty', 'roaster'], routeRole: 'short-detour',
    recommendedDrinks: ['Espresso', 'Filter coffee', 'Single-origin coffee'],
    recommendedPastries: ['Cake', 'Chocolate'],
    morningRecommended: false, afternoonRecommended: true, latestSuggestedCoffeeTime: '15:30',
    seatingType: 'comfortable', badges: ['local roaster', 'route compatible']
  }),
  coffee('combi', 'porto-day-3', 'Porto', 'Combi Coffee Roasters', '15:15', {
    description: 'Industrial roaster detour only when coffee itself becomes part of the attraction.',
    style: ['specialty', 'roaster'], routeRole: 'destination-detour',
    recommendedDrinks: ['Filter coffee', 'Aeropress', 'House blend'],
    recommendedPastries: ['Cinnamon bun'],
    morningRecommended: false, afternoonRecommended: true, latestSuggestedCoffeeTime: '15:30',
    seatingType: 'comfortable', badges: ['destination detour', 'industrial vibe'],
    reviewSnapshot: { rating: 4.4, count: 122, source: 'Tripadvisor', fetchedAt }
  })
];

export const coffeeStopsByDay = (dayId: string) =>
  [...coffeeStops, ...mallorcaCoffeeStops(dayId)]
    .filter(stop => stop.dayId === dayId)
    .sort((a, b) => {
      const roleOrder = { 'on-route': 0, 'short-detour': 1, 'destination-detour': 2, backup: 3 };
      return Number(Boolean(b.preferred)) - Number(Boolean(a.preferred))
        || roleOrder[a.routeRole] - roleOrder[b.routeRole]
        || a.suggestedTime.localeCompare(b.suggestedTime);
    });
