export type Currency = 'EUR' | 'CAD';
export type SyncStatus = 'local-only' | 'pending' | 'synced' | 'conflict';
export type Priority = 'essential' | 'high' | 'flexible';
export type ValidationStatus = 'approved' | 'needs-check' | 'live';
export type CostCategory = 'food' | 'drinks' | 'attractions' | 'transport' | 'hotel' | 'miscellaneous';
export type RouteMode = 'walking' | 'transit' | 'driving' | 'rideshare';
export type CoffeeStyle = 'specialty' | 'traditional' | 'roaster' | 'bakery' | 'pastry-destination';
export type CoffeeRouteRole = 'on-route' | 'short-detour' | 'destination-detour' | 'backup';

export interface TravelerPreferences {
  dietaryNotes?: string[];
  coffee?: { morningWindow: string; afternoonWindow: string; after16Preference: string; pastryPriority: string[]; maxPreferredDetourMinutes: number };
  noPork: boolean;
  seafoodOkay: boolean;
  tripStyle: string[];
  transport: string[];
  diningPace: string;
}

export interface GooglePlaceMetadata {
  openingHours?: string[];
  googlePlaceId?: string;
  rating?: number;
  reviewCount?: number;
  photoUrl?: string;
  photoAttribution?: string;
  popularDishes?: string[];
  reviewTopics?: string[];
  reviewValidation?: 'strong' | 'good' | 'mixed';
  reviewSummary?: string;
  source?: 'google-maps';
  photoReference?: string;
  openNow?: boolean;
  fetchedAt?: string;
  lastUpdated?: string;
  cacheState?: 'live' | 'cached' | 'historical';
}

export interface CoffeeStopProfile {
  googlePlaceQuery?: string;
  address?: string;
  routeMode?: RouteMode;
  id: string;
  dayId: string;
  city: string;
  name: string;
  description: string;
  style: CoffeeStyle[];
  routeRole: CoffeeRouteRole;
  recommendedDrinks: string[];
  uniqueDrink?: string;
  recommendedPastries: string[];
  morningRecommended: boolean;
  afternoonRecommended: boolean;
  suggestedTime: string;
  latestSuggestedCoffeeTime?: string;
  decafAvailable?: boolean;
  seatingType?: 'takeaway' | 'limited' | 'comfortable' | 'terrace';
  badges: string[];
  googleMapsUrl: string;
  reviewSnapshot?: {
    rating: number;
    count: number;
    source: 'Google' | 'Tripadvisor';
    fetchedAt: string;
  };
  livePlaceData?: {
    googlePlaceId?: string;
    photoName?: string;
    imageUrl?: string;
    photoAttribution?: string;
    rating?: number;
    userRatingCount?: number;
    openNow?: boolean;
    openingHours?: string[];
    lastFetchedAt?: string;
  };
}

export interface Place {
  googlePlaceQuery?: string;
  reservationRecommended?: boolean;
  id: string;
  name: string;
  city: string;
  category: string;
  neighborhood?: string;
  address?: string;
  description?: string;
  recommendedDishes?: string[];
  dietaryNotes?: string;
  googleMapsUrl?: string;
  websiteUrl?: string;
  metadata?: GooglePlaceMetadata;
}

export interface AlternativePlace extends Place {
  status?: 'active' | 'backup' | 'archived';
  unavailableOnPlannedDate?: boolean;
  reason?: string;
  takeawayFocused?: boolean;
  vibe?: string;
  estimatedCost?: number;
  distanceLabel?: string;
  dietarySuitable?: boolean;
  curated: boolean;
}

export interface ItinerarySegment {
  googlePlaceQuery?: string;
  plannedDurationMinutes?: number;
  routeKind?: 'flight' | 'boat' | 'surface';
  costUnknown?: boolean;
  costBasis?: string;
  address?: string;
  routeMode?: RouteMode;
  routeOriginOverride?: string;
  routeFromPrevious?: RouteLeg;
  status?: 'active' | 'backup' | 'archived';
  unavailableOnPlannedDate?: boolean;
  reason?: string;
  takeawayFocused?: boolean;
  id: string;
  title: string;
  date: string;
  timeBlock: string;
  category: string;
  placeId: string;
  orderIndex: number;
  isLocked: boolean;
  isCompleted: boolean;
  description: string;
  recommendedDishes: string[];
  dietaryNotes?: string;
  reservationRecommended: boolean;
  bookingNote?: string;
  googleMapsUrl: string;
  websiteUrl?: string;
  transportFromPrevious?: string;
  priority: Priority;
  validationStatus: ValidationStatus;
  googlePlaceMetadata?: GooglePlaceMetadata;
  estimatedCost: number;
  actualCost?: number;
  currency: Currency;
  userNotes: string;
  alternatives: AlternativePlace[];
  syncStatus: SyncStatus;
  updatedAt: string;
  isBackup?: boolean;
}

export interface ItineraryDay {
  stayId?: string;
  startStayId?: string;
  alerts?: TravelAlert[];
  planChoice?: 'primary' | 'backup';
  planAlternatives?: { label: string; segments: ItinerarySegment[] };
  id: string;
  date: string;
  title: string;
  theme: string;
  summary: string;
  segments: ItinerarySegment[];
  backups?: AlternativePlace[];
}

export interface HomeBase {
  id: string;
  address: string;
  city: string;
  neighborhood: string;
  type: 'Airbnb';
  startDate: string;
  endDate: string;
  isLocked: true;
  checkIn?: string;
  checkOut?: string;
  baggageDrop?: string;
  baggageBackups?: string[];
  notes?: string[];
}

export interface RouteLeg {
  plannedDurationMinutes?: number;
  liveDurationMinutes?: number;
  status?: 'planned' | 'live' | 'stale';
  origin: string;
  destination: string;
  mode: RouteMode;
  directionsUrl: string;
  durationMinutes?: number;
  durationLabel: string;
  source: 'planning-estimate' | 'google-routes' | 'unavailable';
  lastUpdated?: string;
}

export interface CityPlan {
  stays: Stay[];
  transportBookings?: TransportBooking[];
  tasks?: TravelTask[];
  homeBase?: HomeBase;
  nearbyPlaces?: AlternativePlace[];
  id: string;
  city: string;
  country: string;
  status: 'active' | 'placeholder';
  startDate?: string;
  endDate?: string;
  nights?: number;
  timezone?: string;
  days: ItineraryDay[];
}

export interface CostEntry {
  id: string;
  segmentId?: string;
  dayId: string;
  title: string;
  category: CostCategory;
  estimatedCost: number;
  actualCost?: number;
  currency: Currency;
  syncStatus: SyncStatus;
  updatedAt: string;
}

export interface Trip {
  country?: string;
  countries?: string[];
  schemaVersion?: number;
  placeMetadataCache?: Record<string, GooglePlaceMetadata>;
  archivedSegments?: ItinerarySegment[];
  carRental?: {
    provider: string;
    date: string;
    pickupAddress: string;
    pickupAllowedFrom: string;
    targetPickup: string;
    vehicle: string;
    passengers: number;
    checkedSuitcases: number;
    returnAddress: string;
    contractualDeadline: string;
    targetReturn: string;
    afterReturn: string;
    route: string[];
  };
  id: string;
  title: string;
  activeCityId: string;
  startDate: string;
  endDate: string;
  nights: number;
  hotelBase: string;
  preferences: TravelerPreferences;
  cities: CityPlan[];
  costs: CostEntry[];
  syncStatus: SyncStatus;
  updatedAt: string;
}

export interface Stay {
  id: string;
  name: string;
  type: string;
  address: string;
  startDate: string;
  endDate: string;
  googleMapsUrl: string;
  notes: string[];
  validationStatus?: string;
}
export interface TravelAlert {
  title: string;
  message: string;
  links?: { label: string; url: string }[];
}
export interface TravelTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
}
export interface TransportBooking {
  id: string;
  type: 'flight' | 'rental_car';
  carrier?: string;
  flightNumber?: string;
  date?: string;
  origin?: string;
  destination?: string;
  depart?: string;
  arrive?: string;
  passengers?: number;
  provider?: string;
  pickupLocation?: string;
  pickup?: string;
  returnLocation?: string;
  return?: string;
  vehicleClass?: string;
  price?: number;
  currency?: string;
  notes?: string[];
  prePickupChecklist?: TravelTask[];
}
