import { AlternativePlace, ItineraryDay, ItinerarySegment, RouteMode, Trip } from '@/src/types/models';
import { googleMapsSearchUrl } from '@/src/utils/maps';
import { lisbonAroundAirbnb, lisbonHomeBase, portoAroundAirbnb, portoHomeBase } from '@/src/data/homeBases';

const now = '2026-09-10T00:00:00.000Z';

// These are offline planning allowances, not live Google Routes durations.
// Leave ordinary origins unset so route consumers can follow the previous stop
// after itinerary edits. Only home starts and real transfer boundaries override it.
const route = (
  address: string,
  routeMode: RouteMode,
  estimate: string,
  routeOriginOverride?: string
): Partial<ItinerarySegment> => ({
  address, routeMode,
  ...(routeOriginOverride ? { routeOriginOverride } : {}),
  googleMapsUrl: googleMapsSearchUrl(address),
  transportFromPrevious: `Planning estimate: ${estimate}; not live.`
});

const alternative = (
  id: string,
  name: string,
  category: string,
  extras: Partial<AlternativePlace> = {}
): AlternativePlace => ({
  id, name, city: 'Lisbon', category, curated: true, dietarySuitable: true,
  status: 'backup',
  googleMapsUrl: googleMapsSearchUrl(`${name}, ${extras.city ?? 'Lisbon'}, Portugal`), ...extras
});

const segment = (
  id: string,
  date: string,
  timeBlock: string,
  title: string,
  category: string,
  description: string,
  options: Partial<ItinerarySegment> = {}
): ItinerarySegment => ({
  id, date, timeBlock, title, category, description,
  placeId: `place-${id}`,
  orderIndex: 0,
  isLocked: false,
  isCompleted: false,
  recommendedDishes: [],
  reservationRecommended: false,
  googleMapsUrl: googleMapsSearchUrl(`${title}, Portugal`),
  priority: 'high',
  validationStatus: 'approved',
  status: 'active',
  estimatedCost: 0,
  currency: 'EUR',
  userNotes: '',
  alternatives: [],
  syncStatus: 'local-only',
  updatedAt: now,
  ...options
});

const makeDay = (
  id: string,
  date: string,
  title: string,
  theme: string,
  summary: string,
  segments: ItinerarySegment[],
  backups: AlternativePlace[] = []
): ItineraryDay => ({
  id, date, title, theme, summary,
  segments: segments.map((item, index) => ({ ...item, orderIndex: index })),
  backups
});

export const lisbonDays: ItineraryDay[] = [
  makeDay('day-1', '2026-09-19', 'Arrival + Historic Lisbon', 'Golden-hour history',
    'Drop bags at the Bica Airbnb, explore Chiado and the riverfront, then climb into Alfama. All travel times are planning estimates.',
    [
      segment('lisbon-airbnb-arrival', '2026-09-19', '12:30', 'Lisbon Airbnb — baggage drop', 'accommodation',
        'Early baggage drop is expected; confirm access with the host. If unavailable, try Cais do Sodré station lockers, then Lisbon Airport Terminal 1 lockers; check capacity first.', {
          isLocked: true, priority: 'essential', estimatedCost: 0,
          ...route(lisbonHomeBase.address, 'rideshare', '30–50 min airport ride, plus pickup wait', 'Lisbon Airport Terminal 1, Lisbon, Portugal')
        }),
      segment('manteigaria-1', '2026-09-19', '14:00', 'Manteigaria', 'pastel de nata',
        'A first warm pastel de nata, ideally eaten at the counter.', {
          recommendedDishes: ['Pastel de nata', 'Espresso'], estimatedCost: 6,
          ...route('Manteigaria, Rua do Loreto, Lisbon, Portugal', 'walking', '5–10 min walk')
        }),
      segment('chiado-walk', '2026-09-19', '14:25', 'Chiado', 'neighborhood',
        'Explore the streets around Praça Luís de Camões before heading down to the river.', {
          estimatedCost: 0,
          ...route('Praça Luís de Camões, Lisbon, Portugal', 'walking', '2–5 min walk')
        }),
      segment('praca-comercio', '2026-09-19', '15:00', 'Praça do Comércio', 'sight',
        'Walk the grand riverfront square and the Rua Augusta arch.', {
          priority: 'essential', estimatedCost: 0,
          ...route('Praça do Comércio, Lisbon, Portugal', 'walking', '15–20 min walk')
        }),
      segment('taberna-flores', '2026-09-19', '16:00', 'Taberna da Rua das Flores', 'petiscos',
        'A compact, lively stop for seasonal Portuguese small plates.', {
          recommendedDishes: ['Daily seafood specials', 'Vegetable petiscos'],
          dietaryNotes: 'Petiscos may include presunto, chouriço, or pork-based sauces—ask before ordering.',
          estimatedCost: 28, reservationRecommended: true, bookingNote: 'Expect a queue; go early.',
          ...route('Taberna da Rua das Flores, Lisbon, Portugal', 'walking', '15–20 min uphill walk'),
          alternatives: [alternative('alt-taberna', 'O Velho Eurico', 'petiscos', { vibe: 'lively tavern', estimatedCost: 25 })]
        }),
      segment('alfama', '2026-09-19', '17:30', 'Alfama', 'neighborhood',
        'Wander through tiled lanes and tiny squares, starting at Largo de São Miguel.', {
          estimatedCost: 0,
          ...route('Largo de São Miguel, Alfama, Lisbon, Portugal', 'walking', '25–35 min hilly walk')
        }),
      segment('portas-sol', '2026-09-19', '18:30', 'Miradouro das Portas do Sol', 'viewpoint',
        'Pause above the terracotta roofs for late-afternoon light.', {
          priority: 'essential', estimatedCost: 0,
          ...route('Miradouro das Portas do Sol, Lisbon, Portugal', 'walking', '10–15 min uphill walk')
        }),
      segment('prado', '2026-09-19', '20:00', 'Prado', 'dinner',
        'Season-led modern Portuguese cooking in a calm, plant-filled room.', {
          isLocked: true, reservationRecommended: true, bookingNote: 'Book dinner in advance.',
          recommendedDishes: ['Market fish', 'Seasonal vegetables', 'Portuguese wine'],
          dietaryNotes: 'Tell the server no pork and ask about stocks and sauces.',
          priority: 'essential', estimatedCost: 65,
          ...route('Prado, Lisbon, Portugal', 'walking', '10–15 min downhill walk')
        }),
      segment('pavilhao', '2026-09-19', '22:15', 'Pavilhão Chinês', 'cocktails',
        'Optional nightcap surrounded by cabinets of curiosities.', {
          priority: 'flexible', estimatedCost: 18,
          ...route('Pavilhão Chinês, Lisbon, Portugal', 'rideshare', '10–20 min ride, plus pickup wait')
        }),
      segment('lisbon-airbnb-return-day-1', '2026-09-19', '23:15', 'Return to Lisbon Airbnb', 'accommodation',
        'Return to the booked Bica base; skip the optional nightcap if tired after travel.', {
          ...route(lisbonHomeBase.address, 'rideshare', '5–15 min ride, plus pickup wait')
        })
    ]),
  makeDay('day-2', '2026-09-20', 'Sintra Day Trip', 'Palaces + misty gardens',
    'Start near the Bica Airbnb, then Rossio → Sintra for two estates and lunch. Confirm breakfast hours, train departures and timed admission; timings are estimates.',
    [
      segment('dear-breakfast', '2026-09-20', '08:00', 'Dear Breakfast Bica', 'breakfast',
        'Preferred breakfast at Rua das Gaivotas 17, approximately 08:00–08:45. The official Bica page lists an 08:00 opening; recheck before the visit and leave enough time for Rossio.', {
          recommendedDishes: ['Eggs', 'Pancakes', 'Specialty coffee'], estimatedCost: 18,
          websiteUrl: 'https://www.dearbreakfast.com/',
          bookingNote: 'Official website checked September 10, 2026: Bica lists daily 08:00–16:00. Hours and seating are not guaranteed for September 20; use pre-purchased breakfast only if needed to protect confirmed admission tickets.',
          ...route('Rua das Gaivotas 17, Lisbon, Portugal', 'walking', '5–10 min walk', lisbonHomeBase.address)
        }),
      segment('train-sintra', '2026-09-20', '09:15', 'Rossio station — train to Sintra', 'transport',
        'Leave breakfast by 08:45; target Rossio around 09:10–09:15 and a train around 09:20–09:30. These are planning targets, not a confirmed timetable. Save tickets offline.', {
          isLocked: true, priority: 'essential', estimatedCost: 5,
          ...route('Rossio railway station, Lisbon, Portugal', 'walking', '20–25 min walk to Rossio')
        }),
      segment('pena', '2026-09-20', '11:15', 'Pena Palace', 'attraction',
        'From Rossio, take the train to Sintra, then local bus or taxi to Pena with time for the uphill approach. Plan roughly 11:15–12:45 at the palace, then transfer to Regaleira.', {
          isLocked: true, reservationRecommended: true, bookingNote: '11:15 is a proposed timed-admission target, not a booking. Confirm ticket availability and transfers; do not assume an existing ticket can be changed.',
          priority: 'essential', estimatedCost: 20,
          ...route('Pena Palace entrance, Sintra, Portugal', 'transit', '90–120 min train, local transfer, waiting and uphill approach')
        }),
      segment('regaleira', '2026-09-20', '13:30', 'Quinta da Regaleira', 'attraction',
        'Allow approximately 13:30–15:00 for the initiation well, tunnels and gardens. Confirm admission for this proposed slot and allow for queues.', {
          priority: 'essential', estimatedCost: 15,
          ...route('Quinta da Regaleira entrance, Sintra, Portugal', 'transit', '30–45 min local transfer and walking')
        }),
      segment('bacalhau-vila', '2026-09-20', '15:15', 'Bacalhau na Vila', 'seafood',
        'A later cod lunch, approximately 15:15–16:15, after both estates. Carry a small snack for the palace-and-gardens stretch.', {
          isLocked: true, reservationRecommended: true,
          bookingNote: 'Confirm a 15:15 table and kitchen service directly; preserve this approved lunch when finalizing attraction tickets.',
          recommendedDishes: ['Bacalhau tasting plates', 'Octopus', 'Vinho verde'],
          dietaryNotes: 'Confirm croquettes and sauces do not use pork fat.',
          priority: 'essential', estimatedCost: 38,
          ...route('Bacalhau na Vila, Sintra, Portugal', 'walking', '10–15 min walk')
        }),
      segment('piriquita', '2026-09-20', '16:25', 'Casa Piriquita', 'dessert',
        'Try Sintra’s travesseiro pastry before returning.', {
          recommendedDishes: ['Travesseiro', 'Queijada'], estimatedCost: 7,
          ...route('Casa Piriquita, Sintra, Portugal', 'walking', '3–5 min walk')
        }),
      segment('sintra-return-train', '2026-09-20', '16:50', 'Return train to Rossio', 'transport',
        'Leave the old town around 16:50, walk to Sintra station and take a Lisbon-bound train to Rossio. Allow for waiting and confirm departures on the day.', {
          ...route('Rossio railway station, Lisbon, Portugal', 'transit', '70–90 min station walk, wait and train')
        }),
      segment('lisbon-airbnb-reset-sintra', '2026-09-20', '18:45', 'Lisbon Airbnb — rest before dinner', 'accommodation',
        'Return to the Bica base and refresh before the evening reservation.', {
          ...route(lisbonHomeBase.address, 'walking', '20–25 min walk from Rossio')
        }),
      segment('seen', '2026-09-20', '20:15', 'SEEN Lisboa', 'cocktails with a view',
        'Dinner or sunset drinks with a polished skyline view.', {
          reservationRecommended: true, bookingNote: 'Reserve a terrace table.',
          recommendedDishes: ['Seafood plates', 'Signature cocktail'], estimatedCost: 65,
          ...route('SEEN Lisboa, Lisbon, Portugal', 'rideshare', '15–25 min ride, plus pickup wait')
        }),
      segment('lisbon-airbnb-return-day-2', '2026-09-20', '22:15', 'Return to Lisbon Airbnb', 'accommodation',
        'Return to the booked Bica base after SEEN.', {
          ...route(lisbonHomeBase.address, 'rideshare', '15–25 min ride, plus pickup wait')
        })
    ]),
  makeDay('day-3', '2026-09-21', 'Trendy Lisbon + Local Neighborhoods', 'Creative west + local life',
    'From the Bica Airbnb to creative west Lisbon, then Bonjardim for Monday dinner. Frangasqueira is saved only as an unavailable backup. Travel times are estimates.',
    [
      segment('heim', '2026-09-21', '09:00', 'Heim Cafe', 'breakfast',
        'A sunny neighborhood brunch start.', {
          recommendedDishes: ['Shakshuka', 'Pancakes', 'Coffee'], estimatedCost: 20,
          ...route('Heim Cafe, Lisbon, Portugal', 'walking', '15–25 min walk', lisbonHomeBase.address)
        }),
      segment('lx-factory', '2026-09-21', '10:30', 'LX Factory', 'neighborhood',
        'Browse independent shops, murals, and Ler Devagar bookstore.', {
          estimatedCost: 0,
          ...route('LX Factory entrance, Rua Rodrigues de Faria, Lisbon, Portugal', 'rideshare', '10–20 min ride, plus pickup wait')
        }),
      segment('cantina-lx', '2026-09-21', '12:30', 'Cantina LX', 'lunch',
        'Industrial-chic Portuguese lunch inside LX Factory.', {
          recommendedDishes: ['Grilled fish', 'Daily vegetables'],
          dietaryNotes: 'Ask whether daily specials, soup, or mixed grill contain pork.',
          estimatedCost: 25,
          ...route('Cantina LX, LX Factory, Lisbon, Portugal', 'walking', '3–5 min walk within LX Factory')
        }),
      segment('campo-ourique', '2026-09-21', '14:15', 'Campo de Ourique', 'neighborhood',
        'Start at Jardim da Parada and explore the neighborhood streets.', {
          estimatedCost: 0,
          ...route('Jardim da Parada, Campo de Ourique, Lisbon, Portugal', 'rideshare', '15–25 min ride, plus pickup wait')
        }),
      segment('mercado-campo', '2026-09-21', '15:00', 'Mercado de Campo de Ourique', 'food market',
        'Browse stalls and optionally share a seafood snack or glass of wine.', {
          recommendedDishes: ['Oysters', 'Cod dishes', 'Portuguese wine'],
          dietaryNotes: 'Avoid bifana, presunto, enchidos, and mixed-grill stalls.',
          estimatedCost: 16,
          ...route('Mercado de Campo de Ourique, Lisbon, Portugal', 'walking', '5–10 min walk')
        }),
      segment('jardim-estrela', '2026-09-21', '16:15', 'Jardim da Estrela', 'park',
        'Rest under palms and old trees across from the basilica.', {
          estimatedCost: 0,
          ...route('Jardim da Estrela, Lisbon, Portugal', 'walking', '15–20 min walk')
        }),
      segment('gelato', '2026-09-21', '17:15', 'Gelato Davvero', 'dessert',
        'A small, high-quality gelato pause.', {
          recommendedDishes: ['Pistachio gelato', 'Seasonal fruit sorbet'], estimatedCost: 6,
          ...route('Gelato Davvero, Praça de São Paulo, Lisbon, Portugal', 'walking', '20–30 min downhill walk')
        }),
      segment('bonjardim', '2026-09-21', '19:30', 'Bonjardim', 'piri-piri chicken',
        'Primary Monday dinner: classic piri-piri chicken. Frangasqueira Nacional is closed Monday and remains a saved backup for another date.', {
          isLocked: true, priority: 'essential',
          recommendedDishes: ['Piri-piri chicken', 'Fries', 'Salad'],
          dietaryNotes: 'Confirm grill and basting sauce are free from pork fat or cross-contact.',
          estimatedCost: 24,
          ...route('Bonjardim, Lisbon, Portugal', 'walking', '20–25 min walk'),
          alternatives: [alternative('frangasqueira-alt', 'Frangasqueira Nacional', 'piri-piri chicken', {
            description: 'Saved favorite for a different day, not a usable September 21 dinner replacement.',
            status: 'backup', unavailableOnPlannedDate: true, reason: 'closed Monday', takeawayFocused: true,
            vibe: 'takeaway-focused charcoal chicken', estimatedCost: 20,
            recommendedDishes: ['Piri-piri chicken', 'Fries', 'Salad'],
            dietaryNotes: 'Confirm the basting sauce and grill preparation are pork-free.'
          })]
        }),
      segment('park-bar', '2026-09-21', '21:30', 'Park Rooftop', 'cocktails with a view',
        'Finish above Bairro Alto with city lights and a casual drink.', {
          priority: 'flexible', estimatedCost: 18,
          ...route('Park Bar, Calçada do Combro, Lisbon, Portugal', 'walking', '15–25 min uphill walk')
        }),
      segment('lisbon-airbnb-return-day-3', '2026-09-21', '22:30', 'Return to Lisbon Airbnb', 'accommodation',
        'Pack both checked-size suitcases and prepare breakfast for tomorrow’s early checkout.', {
          ...route(lisbonHomeBase.address, 'walking', '5–10 min walk')
        })
    ]),
];

export const portoDays: ItineraryDay[] = [
  makeDay('porto-day-1', '2026-09-22', 'Óbidos + Nazaré Road Trip', 'Medieval walls to Atlantic cliffs',
    'Lisbon Airbnb → Lisbon Airport SIXT → Óbidos (1.5–2 hr) → Nazaré (3+ hr with lunch and coffee) → Porto Airport SIXT → Porto Airbnb. Travel times are estimates.',
    [
      segment('porto-roadtrip-checkout', '2026-09-22', '08:00', 'Lisbon Airbnb — breakfast + early checkout', 'breakfast',
        'Eat a simple pre-purchased breakfast, check out and aim to leave by 08:30 with both suitcases. The host’s latest checkout is 11:00; depart earlier for airport pickup.', {
          isLocked: true, priority: 'essential', estimatedCost: 20,
          ...route(lisbonHomeBase.address, 'walking', '0 min; already at the Lisbon Airbnb', lisbonHomeBase.address)
        }),
      segment('porto-rental-pickup', '2026-09-22', '09:15', 'Lisbon Airport SIXT — pickup', 'transport',
        'Pickup is allowed after 09:00; target 09:15–10:00. Collect the booked automatic compact crossover/SUV for 2 adults and 2 checked-size suitcases. Photograph condition, check luggage fit and confirm toll handling.', {
          isLocked: true, priority: 'essential', estimatedCost: 300, currency: 'CAD',
          bookingNote: 'SIXT booking is fixed. Cost is an existing planning estimate, not the confirmed charge. Confirm fuel policy and return instructions; leave after handover, around 10:00.',
          ...route('Lisbon Airport SIXT, Lisbon, Portugal', 'rideshare', '30–50 min Uber ride, plus pickup wait', lisbonHomeBase.address)
        }),
      segment('roadtrip-obidos', '2026-09-22', '11:15', 'Óbidos', 'historic town',
        'Allow approximately 11:15–13:00 (1.5–2 hours). Park outside the walls, then explore Porta da Vila, Rua Direita and the castle; keep wall walking optional.', {
          priority: 'essential', estimatedCost: 6,
          recommendedDishes: ['Ginjinha in a chocolate cup — passenger only'],
          dietaryNotes: 'Driver: no alcohol; choose a non-alcoholic drink.',
          ...route('Public parking outside Porta da Vila, Óbidos, Portugal', 'driving', '60–80 min drive, plus parking'),
          alternatives: [alternative('obidos-parking-alt', 'Parking near Óbidos walls', 'parking', {
            city: 'Óbidos',
            description: 'Use an exterior lot rather than driving into the historic centre.'
          })]
        }),
      segment('roadtrip-pangeia-nazare', '2026-09-22', '14:00', 'Pangeia Restaurante', 'seafood lunch',
        'Primary Nazaré lunch, approximately 14:00–15:15. Keep optional Colour Beans coffee around 15:30, before the viewpoints; allow at least 3 hours in Nazaré overall.', {
          isLocked: true, reservationRecommended: true, priority: 'essential', estimatedCost: 50,
          recommendedDishes: ['Octopus', 'Fresh sea bass or catch of the day', 'Seafood rice', 'Shellfish starter'],
          dietaryNotes: 'Seafood-focused. Choose a non-alcoholic drink for the driver.',
          ...route('Pangeia Restaurante, Nazaré, Portugal', 'driving', '35–50 min drive from Óbidos, plus parking'),
          alternatives: [alternative('roadtrip-taberna-adelia', 'Taberna d’Adélia', 'seafood lunch', {
            city: 'Nazaré', status: 'backup',
            description: 'Traditional seafood backup near Nazaré beach; confirm Tuesday hours and availability.',
            estimatedCost: 45, distanceLabel: 'Nazaré beach'
          })]
        }),
      segment('roadtrip-nazare-sitio', '2026-09-22', '16:00', 'Nazaré Sítio + Praia do Norte', 'viewpoint',
        'Start at Miradouro do Suberco; explore the sanctuary, fort and Praia do Norte as time permits, returning to the car at Sítio. Leave Nazaré around 18:00 to preserve the airport refuel and return buffer.', {
          priority: 'essential', estimatedCost: 5,
          ...route('Miradouro do Suberco, Nazaré, Portugal', 'driving', '10–20 min local drive, plus parking; coffee detour extra'),
          alternatives: [alternative('nazare-beach-alt', 'Praia da Nazaré', 'beach', {
            city: 'Nazaré',
            description: 'A gentler beach-level alternative if the cliffs are foggy.'
          })]
        }),
      segment('roadtrip-refuel', '2026-09-22', '20:45', 'Refuel near Porto Airport', 'transport',
        'Leave Nazaré around 18:00; allow roughly 2 hr 45 min–3 hr 15 min driving, plus rest or traffic delays. Target fuel around 20:45–21:15 and allow 20–30 minutes; select a station before driving.', {
          priority: 'essential', estimatedCost: 0, validationStatus: 'needs-check',
          ...route('Fuel station near Porto Airport, Maia, Portugal', 'driving', '165–195 min drive; rest, traffic and refueling extra')
        }),
      segment('porto-rental-return', '2026-09-22', '21:30', 'Porto Airport SIXT — return', 'transport',
        'Operational target: return during 21:00–22:00, aiming for 21:30 after refueling. Contractual deadline: 23:30 the same day. Allow 20–30 minutes for handover, photos and a return receipt.', {
          isLocked: true, priority: 'essential', estimatedCost: 25,
          bookingNote: '23:30 is the contractual deadline, not the planned arrival time. Preserve the buffer if sightseeing or traffic runs late.',
          ...route('Porto Airport SIXT return, Maia, Portugal', 'driving', '10–15 min local drive; handover extra')
        }),
      segment('porto-airport-shuttle', '2026-09-22', '22:00', 'SIXT shuttle to Porto Airport terminal', 'transport',
        'After completing the car return, take the SIXT shuttle to OPO arrivals. Allow roughly 20–35 minutes including waiting; confirm the pickup point with SIXT at handover.', {
          isLocked: true, priority: 'essential', estimatedCost: 0,
          ...route('Porto Airport OPO arrivals, Maia, Portugal', 'transit', '20–35 min SIXT shuttle and wait')
        }),
      segment('porto-airbnb-checkin', '2026-09-22', '23:00', 'Porto Airbnb — self check-in', 'accommodation',
        'From OPO arrivals, take Uber to Rua do Infante Dom Henrique 45 and self check in. Arrival around 23:00 is approximate; save access instructions offline and allow later arrival if transfers are delayed.', {
          isLocked: true, priority: 'essential', estimatedCost: 0,
          bookingNote: 'Airbnb is booked and fixed. Accommodation total has not been supplied; €0 here is not a claim that the stay is free.',
          ...route(portoHomeBase.address, 'rideshare', '25–40 min Uber from terminal, plus pickup wait')
        })
    ]),
  makeDay('porto-day-2', '2026-09-23', 'Historic Porto + Gaia Wine', 'Tiles, riverfront + Port',
    'Start at the Ribeira Airbnb, explore historic Porto, then cross to Gaia for optional 7g coffee and two tastings. Travel times are estimates.',
    [
      segment('porto-do-norte', '2026-09-23', '08:30', 'Do Norte Café by Hungry Biker', 'breakfast',
        'Start with a substantial breakfast before the long walking route.', {
          recommendedDishes: ['Eggs with sourdough', 'Pancakes or waffles to share', 'Coffee', 'Fresh juice'],
          estimatedCost: 20,
          ...route('Do Norte Café by Hungry Biker, Porto, Portugal', 'walking', '20–25 min uphill walk', portoHomeBase.address)
        }),
      segment('porto-bolhao-market', '2026-09-23', '10:00', 'Mercado do Bolhão', 'market',
        'Browse produce, fish, cheese, canned seafood, olive oil, and northern pantry products.', {
          priority: 'essential', estimatedCost: 12,
          recommendedDishes: ['Local canned seafood', 'Cheese', 'Olive oil'],
          ...route('Mercado do Bolhão, Porto, Portugal', 'walking', '10–15 min walk')
        }),
      segment('porto-capela-almas', '2026-09-23', '11:00', 'Capela das Almas', 'architecture',
        'A short exterior photography stop for the blue-and-white tiled façade.', {
          estimatedCost: 0,
          ...route('Capela das Almas, Porto, Portugal', 'walking', '3–5 min walk')
        }),
      segment('porto-sao-bento', '2026-09-23', '11:35', 'São Bento Station', 'architecture',
        'Take in the monumental azulejo hall before continuing downhill.', {
          priority: 'essential', estimatedCost: 0,
          ...route('São Bento railway station, Porto, Portugal', 'walking', '10–15 min walk')
        }),
      segment('porto-cathedral', '2026-09-23', '12:15', 'Porto Cathedral viewpoint', 'viewpoint',
        'Pause above the roofs and Douro; the planned market lunch means a short return uphill afterward.', {
          estimatedCost: 0,
          ...route('Terreiro da Sé, Porto Cathedral, Porto, Portugal', 'walking', '5–10 min uphill walk')
        }),
      segment('porto-bolhao-lunch', '2026-09-23', '13:00', 'Mercado do Bolhão restaurant level', 'seafood lunch',
        'Keep lunch flexible at the market restaurant level.', {
          recommendedDishes: ['Grilled fish', 'Cod', 'Octopus', 'Seafood rice', 'Vegetable plates'],
          dietaryNotes: 'Avoid presunto, chouriço, mixed meat boards, and pork-based stocks.',
          estimatedCost: 28,
          ...route('Mercado do Bolhão, Porto, Portugal', 'walking', '15–20 min walk back to the market')
        }),
      segment('porto-castro-nata', '2026-09-23', '14:20', 'Castro — Atelier de Pastéis de Nata', 'pastel de nata',
        'A polished nata-and-espresso pause before the river walk.', {
          recommendedDishes: ['Pastel de nata', 'Espresso'], estimatedCost: 7,
          ...route('Castro Atelier de Pastéis de Nata, Rua de Mouzinho da Silveira, Porto, Portugal', 'walking', '15–20 min downhill walk'),
          alternatives: [alternative('manteigaria-porto-alt', 'Manteigaria Porto', 'pastel de nata', {
            city: 'Porto', estimatedCost: 6
          })]
        }),
      segment('porto-ribeira-walk', '2026-09-23', '15:00', 'Rua das Flores + Ribeira', 'neighborhood',
        'Explore Rua das Flores and the riverfront, ending at Praça da Ribeira before crossing to Gaia.', {
          priority: 'essential', estimatedCost: 0,
          ...route('Praça da Ribeira, Porto, Portugal', 'walking', '10–20 min walk including Rua das Flores')
        }),
      segment('gaia-dom-luis-bridge', '2026-09-23', '15:20', 'Dom Luís I Bridge — lower deck to Gaia', 'sight',
        'Cross to the Gaia riverfront. Optional 7g Roaster coffee around 15:40 is an addition, not a replacement; skip it if needed to protect the Burmester booking.', {
          priority: 'essential', estimatedCost: 0,
          ...route('Avenida de Diogo Leite at Dom Luís I Bridge, Vila Nova de Gaia, Portugal', 'walking', '10–15 min walk across the lower deck')
        }),
      segment('gaia-burmester', '2026-09-23', '16:30', 'Burmester Cellars — Premium Tasting', 'wine tasting',
        'A traditional one-hour guided cellar visit with three Ports and chocolate.', {
          isLocked: true, reservationRecommended: true, priority: 'essential',
          bookingNote: 'Premium tasting planning price: approximately €23 per person.',
          recommendedDishes: ['Three-Port flight', 'Chocolate pairing'], estimatedCost: 46,
          dietaryNotes: 'Alcohol tasting.',
          ...route('Burmester Cellars, Vila Nova de Gaia, Portugal', 'walking', '3–5 min walk from the Gaia bridge end; optional coffee detour extra'),
          alternatives: [alternative('gaia-calem-alt', 'Cálem Cellars', 'wine tasting', {
            city: 'Vila Nova de Gaia',
            description: 'Efficient backup with Classic and Premium tours near €19–20.',
            estimatedCost: 40
          })]
        }),
      segment('gaia-porto-cruz', '2026-09-23', '18:00', 'Espaço Porto Cruz', 'tasting with a view',
        'Choose a simple rooftop Port flight or cocktail; upgrade to the guided five-Port tasting only if you want more depth.', {
          reservationRecommended: true, estimatedCost: 35,
          recommendedDishes: ['Port flight', 'Port cocktail'],
          dietaryNotes: 'Alcohol tasting.',
          ...route('Espaço Porto Cruz, Vila Nova de Gaia, Portugal', 'walking', '5–10 min walk'),
          alternatives: [alternative('gaia-wow-alt', 'WOW Porto', 'wine experience', {
            city: 'Vila Nova de Gaia',
            description: 'Contemporary Gaia backup with multiple museums and tasting venues.'
          })]
        }),
      segment('gaia-jardim-morro', '2026-09-23', '19:10', 'Jardim do Morro', 'sunset viewpoint',
        'Take an Uber uphill, or use the cable car if operating. Enjoy Jardim do Morro; Serra do Pilar is the saved nearby viewpoint option.', {
          priority: 'essential', estimatedCost: 7,
          ...route('Jardim do Morro, Vila Nova de Gaia, Portugal', 'rideshare', '10–20 min ride, plus pickup wait'),
          alternatives: [alternative('serra-pilar-alt', 'Serra do Pilar', 'viewpoint', {
            city: 'Vila Nova de Gaia',
            description: 'Quieter architectural viewpoint above the bridge.'
          })]
        }),
      segment('porto-gruta', '2026-09-23', '20:30', 'Gruta', 'seafood dinner',
        'Modern fish and seafood cooking after the Gaia tastings.', {
          isLocked: true, reservationRecommended: true, priority: 'essential',
          recommendedDishes: ['Fish moqueca', 'Catch of the day', 'Carabineiro rice to share'],
          dietaryNotes: 'Confirm garnishes, stocks, and specials contain no pork.',
          estimatedCost: 75,
          ...route('Gruta, Porto, Portugal', 'rideshare', '15–25 min ride, plus pickup wait'),
          alternatives: [alternative('porto-gruta-gaveto-alt', 'O Gaveto', 'seafood dinner', {
            city: 'Matosinhos', estimatedCost: 65, distanceLabel: 'Matosinhos'
          })]
        }),
      segment('porto-airbnb-return-day-2', '2026-09-23', '22:15', 'Return to Porto Airbnb', 'accommodation',
        'Return to the fixed Ribeira base after dinner.', {
          ...route(portoHomeBase.address, 'rideshare', '10–20 min ride, plus pickup wait')
        })
    ]),
  makeDay('porto-day-3', '2026-09-24', 'Foz + Matosinhos Coast', 'Atlantic air + northern seafood',
    'From the Ribeira Airbnb to Foz and Matosinhos, with optional Tavi and specialty coffee, then chicken dinner and preflight prep. Douro Valley is only a full-day swap; travel times are estimates.',
    [
      segment('porto-zenith', '2026-09-24', '09:00', 'Zenith Porto', 'breakfast',
        'A popular brunch start with vegan and gluten-free options.', {
          recommendedDishes: ['Shakshuka', 'Eggs Benedict without pork', 'Pancakes to share', 'Coffee'],
          dietaryNotes: 'Request Eggs Benedict without ham and confirm the sauce is pork-free.',
          estimatedCost: 22,
          ...route('Zenith Porto, Porto, Portugal', 'walking', '20–25 min uphill walk', portoHomeBase.address)
        }),
      segment('porto-foz', '2026-09-24', '10:30', 'Jardim do Passeio Alegre + Foz promenade', 'coast',
        'Take an Uber to Jardim do Passeio Alegre, then follow the promenade toward the Atlantic. Bus 500 is a scenic alternative with a longer timetable-dependent journey.', {
          priority: 'essential', estimatedCost: 5,
          ...route('Jardim do Passeio Alegre, Foz do Douro, Porto, Portugal', 'rideshare', '20–30 min ride, plus pickup wait'),
          alternatives: [alternative('palacio-cristal-alt', 'Jardins do Palácio de Cristal', 'park', {
            city: 'Porto',
            description: 'Weather-friendly city alternative with Douro viewpoints.'
          })]
        }),
      segment('porto-pergola-foz', '2026-09-24', '11:30', 'Pérgola da Foz', 'architecture',
        'Continue along the seaside promenade. Tavi is an optional coffee/pastry pause along the Foz walk; allow extra time if stopping.', {
          estimatedCost: 0,
          ...route('Pérgola da Foz, Porto, Portugal', 'walking', '20–30 min promenade walk; optional Tavi stop extra')
        }),
      segment('porto-castelo-queijo', '2026-09-24', '12:10', 'Castelo do Queijo', 'coast',
        'Continue past the fort toward the broad Matosinhos beachfront.', {
          estimatedCost: 0,
          ...route('Castelo do Queijo, Porto, Portugal', 'walking', '20–30 min coastal walk')
        }),
      segment('matosinhos-beach', '2026-09-24', '12:40', 'Matosinhos Beach', 'beach',
        'Walk the sand and seafront; the Atlantic is likely cool even in September.', {
          priority: 'essential', estimatedCost: 0,
          ...route('Praia de Matosinhos, Matosinhos, Portugal', 'walking', '10–15 min walk'),
          alternatives: [alternative('casa-arquitectura-alt', 'Casa da Arquitectura', 'architecture', {
            city: 'Matosinhos',
            description: 'Use this offbeat indoor swap for poor weather or an architecture-heavy afternoon.'
          })]
        }),
      segment('matosinhos-o-gaveto', '2026-09-24', '13:40', 'O Gaveto', 'seafood lunch',
        'A classic Matosinhos seafood lunch. Optional Booínga specialty coffee around 15:15 follows lunch; aim to finish caffeinated coffee before approximately 16:00.', {
          isLocked: true, reservationRecommended: true, priority: 'essential',
          recommendedDishes: ['Grilled sea bass, bream, or turbot', 'Clams', 'Octopus', 'Seafood rice'],
          dietaryNotes: 'Seafood-focused; confirm rice and sauces use no pork stock.',
          estimatedCost: 65,
          ...route('O Gaveto, Matosinhos, Portugal', 'walking', '10–15 min walk'),
          alternatives: [alternative('matosinhos-marisqueira-alt', 'A Marisqueira de Matosinhos', 'seafood lunch', {
            city: 'Matosinhos',
            description: 'Traditional backup for a larger shellfish or seafood platter.',
            estimatedCost: 65
          })]
        }),
      segment('porto-leitaria', '2026-09-24', '17:15', 'Leitaria da Quinta do Paço', 'dessert',
        'Return to Porto for an éclair. Prefer decaf or a non-coffee drink this late. Buy tomorrow’s grab-and-go breakfast and water before dinner; do not rely on late grocery hours.', {
          recommendedDishes: ['Classic whipped-cream éclair', 'Chocolate éclair', 'Decaf if available'],
          estimatedCost: 9,
          ...route('Leitaria da Quinta do Paço, Praça Guilherme Gomes Fernandes, Porto, Portugal', 'rideshare', '25–40 min ride from Matosinhos, plus pickup wait'),
          alternatives: [alternative('porto-castro-dessert-alt', 'Castro — Atelier de Pastéis de Nata', 'dessert', {
            city: 'Porto', estimatedCost: 7
          })]
        }),
      segment('porto-pedro-frangos', '2026-09-24', '19:30', 'Pedro dos Frangos', 'piri-piri chicken',
        'A longstanding, straightforward grilled-chicken specialist for the final Porto dinner.', {
          isLocked: true, reservationRecommended: true, priority: 'essential',
          recommendedDishes: ['Roast or grilled chicken', 'Piri-piri sauce', 'Fries or rice', 'Salad'],
          dietaryNotes: 'Avoid sausage and mixed grills. A “chicken francesinha” may still contain ham or sausage—ask directly.',
          estimatedCost: 25,
          ...route('Pedro dos Frangos, Porto, Portugal', 'walking', '10–15 min walk'),
          alternatives: [alternative('porto-pedro-gruta-alt', 'Gruta', 'seafood dinner', {
            city: 'Porto', estimatedCost: 75
          })]
        }),
      segment('porto-preflight-prep', '2026-09-24', '21:00', 'Porto Airbnb — preflight preparation', 'accommodation',
        'Store the breakfast bought earlier in the Airbnb kitchen, pack both suitcases, download boarding passes and confirm airline bag-drop cutoffs. Arrange Uber for approximately 05:10 from this address and save host checkout instructions.', {
          isLocked: true, priority: 'essential',
          ...route(portoHomeBase.address, 'walking', '15–25 min downhill walk')
        })
    ], [
      alternative('porto-lello', 'Livraria Lello — optional backup', 'paid attraction', {
        city: 'Porto', status: 'backup', estimatedCost: 16,
        address: 'Livraria Lello, Porto, Portugal',
        googleMapsUrl: googleMapsSearchUrl('Livraria Lello, Porto, Portugal'),
        description: 'Saved weather-dependent daytime swap only. Check opening hours and book a valid timed ticket if activating it; this is not a scheduled evening visit.',
        reason: 'Optional daytime swap; not part of the primary coastal itinerary.'
      }),
      alternative('carmo-alt', 'Igreja do Carmo exterior', 'architecture', {
        city: 'Porto', description: 'Free architectural alternative to a timed Lello visit.'
      }),
      alternative('porto-douro-full-day-swap', 'Douro Valley — optional full-day swap', 'full-day swap', {
        city: 'Douro Valley', status: 'backup',
        description: 'Replace the whole coastal day only if deliberately chosen; never append to the primary itinerary. Arrange a tour or other transport separately—the SIXT car is returned September 22.',
        reason: 'Optional full-day alternative; Foz and Matosinhos remain the primary September 24 plan.'
      })
    ]),
  makeDay('porto-day-4', '2026-09-25', 'Early Flight to Mallorca', 'A very early goodbye',
    'Grab breakfast from the Airbnb kitchen and target Uber departure at 05:10 for the 08:00 OPO → PMI flight. Airport travel is an estimate, not a live ETA.',
    [
      segment('porto-breakfast-box', '2026-09-25', '04:50', 'Airbnb kitchen — grab-and-go breakfast', 'breakfast',
        'Take the breakfast purchased yesterday from the kitchen, check documents and luggage, and follow the host’s checkout instructions. Be ready outside for Uber by 05:10.', {
          isLocked: true, estimatedCost: 0,
          ...route(portoHomeBase.address, 'walking', '0 min; already at the Airbnb', portoHomeBase.address)
        }),
      segment('porto-airport-ride', '2026-09-25', '05:10', 'Uber to Porto Airport', 'transport',
        'Target departure from Rua do Infante Dom Henrique 45 at approximately 05:10. Allow roughly 25–40 minutes driving, plus pickup delay; aim to reach departures by about 06:00.', {
          isLocked: true, priority: 'essential', estimatedCost: 25,
          ...route('Porto Airport OPO departures, Maia, Portugal', 'rideshare', '25–40 min Uber ride, plus pickup wait', portoHomeBase.address)
        }),
      segment('porto-airport-security', '2026-09-25', '06:00', 'Check-in + security', 'flight',
        'Aim to be at departures about two hours before the 08:00 flight. Complete bag drop and security, respecting the airline’s actual cutoffs; this is a buffer, not a guarantee of queue length.', {
          isLocked: true, priority: 'essential', estimatedCost: 0,
          ...route('Porto Airport OPO departures, Maia, Portugal', 'walking', '5–10 min terminal walk; check-in and security queues extra')
        }),
      segment('porto-palma-flight', '2026-09-25', '08:00', 'OPO → PMI — flight to Palma de Mallorca', 'flight',
        'Scheduled departure 08:00 from Porto OPO to Palma de Mallorca PMI. Follow the boarding pass gate and boarding deadline; directions remain within OPO, not a ground route to Mallorca.', {
          isLocked: true, priority: 'essential', estimatedCost: 0,
          ...route('Porto Airport OPO departures, Maia, Portugal', 'walking', '10–20 min gate walk after security; follow airport signs')
        })
    ])
];

const baseSeedTrip: Trip = {
  schemaVersion: 5,
  id: 'portugal-2026',
  title: 'Portugal, slowly',
  activeCityId: 'lisbon',
  startDate: '2026-09-19',
  endDate: '2026-09-25',
  nights: 6,
  hotelBase: lisbonHomeBase.address,
  carRental: {
    provider: 'SIXT',
    date: '2026-09-22',
    pickupAddress: 'Lisbon Airport SIXT, Lisbon, Portugal',
    pickupAllowedFrom: '09:00',
    targetPickup: '09:15–10:00',
    vehicle: 'Automatic compact crossover/SUV',
    passengers: 2,
    checkedSuitcases: 2,
    returnAddress: 'Porto Airport SIXT return, Maia, Portugal',
    contractualDeadline: '23:30',
    targetReturn: '21:00–22:00',
    afterReturn: 'SIXT airport shuttle, then Uber to the Porto Airbnb at Rua do Infante Dom Henrique 45.',
    route: ['Lisbon Airport', 'Óbidos', 'Nazaré', 'Porto Airport']
  },
  preferences: {
    noPork: true,
    seafoodOkay: true,
    tripStyle: ['historic charm', 'food + nightlife', 'local neighborhoods', 'hidden gems', 'Port wine', 'river views', 'Atlantic coast', 'architecture', 'photography'],
    transport: ['walk within neighborhoods', 'Uber/Bolt between neighborhoods', 'train to Sintra', 'one-way rental car', 'scenic bus'],
    diningPace: 'One full dinner per day plus optional drinks or petiscos'
  },
  cities: [
    {
      id: 'lisbon',
      stays: [],
      city: 'Lisbon',
      country: 'Portugal',
      status: 'active',
      startDate: '2026-09-19',
      endDate: '2026-09-22',
      nights: 3,
      timezone: 'Europe/Lisbon',
      homeBase: lisbonHomeBase,
      nearbyPlaces: lisbonAroundAirbnb,
      days: lisbonDays
    },
    {
      id: 'porto',
      stays: [],
      city: 'Porto',
      country: 'Portugal',
      status: 'active',
      startDate: '2026-09-22',
      endDate: '2026-09-25',
      nights: 3,
      timezone: 'Europe/Lisbon',
      homeBase: portoHomeBase,
      nearbyPlaces: portoAroundAirbnb,
      days: portoDays
    }
  ],
  costs: [],
  syncStatus: 'local-only',
  updatedAt: now
};

// Do not inject static review snapshots into a fresh itinerary. The existing
// Places layer owns live/cached metadata and its lastUpdated timestamp.
export const seedTrip: Trip = baseSeedTrip;
