import { GooglePlaceMetadata, Trip } from '@/src/types/models';

export const GOOGLE_REVIEW_SNAPSHOT_DATE = '2026-06-19T12:00:00.000Z';

interface ReviewSnapshot extends GooglePlaceMetadata {
  rating: number;
  reviewCount: number;
  popularDishes: string[];
  reviewTopics: string[];
  reviewValidation: 'strong' | 'good' | 'mixed';
  reviewSummary: string;
  source: 'google-maps';
  fetchedAt: string;
}

const snapshot = (
  rating: number,
  reviewCount: number,
  popularDishes: string[],
  reviewTopics: string[],
  reviewSummary: string
): ReviewSnapshot => ({
  rating,
  reviewCount,
  popularDishes,
  reviewTopics,
  reviewValidation: rating >= 4.5 ? 'strong' : rating >= 4.0 ? 'good' : 'mixed',
  reviewSummary,
  source: 'google-maps',
  fetchedAt: GOOGLE_REVIEW_SNAPSHOT_DATE,
  lastUpdated: GOOGLE_REVIEW_SNAPSHOT_DATE,
  cacheState: 'historical'
});

export const googleReviewSnapshotsBySegmentId: Record<string, ReviewSnapshot> = {
  'manteigaria-1': snapshot(
    4.8, 10599,
    ['Pastel de nata', 'Espresso'],
    ['pastel de nata', 'cinnamon', 'custard', 'flaky crust', 'espresso'],
    'Exceptionally high-volume validation; reviews repeatedly praise warm, crisp custard tarts.'
  ),
  'taberna-flores': snapshot(
    4.3, 3150,
    ['Oysters', 'Daily white fish', 'Scallops or prawns'],
    ['scallops', 'Portuguese food', 'tapas', 'ceviche', 'squid', 'prawns'],
    'Well-reviewed for seafood-led daily plates; portions and the no-reservations queue receive mixed comments.'
  ),
  prado: snapshot(
    4.3, 1518,
    ['Butternut squash', 'Beef tartare', 'Mushroom ice cream or brioche dessert'],
    ['sommelier', 'butternut squash', 'tasting menu', 'beef tartare', 'natural wines'],
    'Strong food and wine signals, with frequently changing seasonal dishes.'
  ),
  pavilhao: snapshot(
    4.4, 4315,
    ['Old fashioned', 'Royal coffee', 'Martini'],
    ['decoration', 'pool tables', 'cocktail bar', 'old fashioned', 'quirky bar'],
    'Large review base validates the atmosphere first and classic cocktails second.'
  ),
  'dear-breakfast': snapshot(
    4.5, 5152,
    ['Turkish eggs', 'Avocado toast', 'Açaí bowl'],
    ['Turkish eggs', 'avocado toast', 'eggs benedict', 'croissant', 'açaí bowl'],
    'Strong breakfast validation; wait times are the most common negative signal.'
  ),
  'bacalhau-vila': snapshot(
    4.6, 2145,
    ['Codfish à Brás', 'Cod cakes', 'Octopus salad'],
    ['cod', 'codfish à Brás', 'cod cakes', 'octopus salad', 'chocolate cake'],
    'Highly validated Sintra lunch choice with concentrated praise for cod preparations.'
  ),
  piriquita: snapshot(
    4.4, 6972,
    ['Travesseiro', 'Pastel de nata', 'Queijada'],
    ['Sintra pillow', 'puff pastry', 'almond cream', 'traditional pastries'],
    'Very large review base confirms the travesseiro as the signature order.'
  ),
  seen: snapshot(
    4.2, 1755,
    ['Fresh oysters', 'Sushi', 'Tarte SEEN'],
    ['cocktails', 'sunset view', 'sushi', 'rooftop', 'terrace', 'carpaccio'],
    'Validated mainly for views, cocktails, and scene; food feedback is less consistent.'
  ),
  'v-rooftop': snapshot(
    4.4, 442,
    ['Spicy hibiscus cocktail', 'Sangria', 'Signature cocktail'],
    ['rooftop', 'cocktails', 'sunset view', 'city view', 'sangria'],
    'Good but smaller review sample; consistently praised as an intimate sunset drinks stop.'
  ),
  heim: snapshot(
    4.7, 4975,
    ['Mashed egg sandwich', 'Crème brûlée French toast', 'Pancakes'],
    ['waffles', 'pancakes', 'avocado toast', 'Turkish eggs', 'mushroom toast'],
    'Strong, high-volume brunch validation across sweet and savory dishes.'
  ),
  'cantina-lx': snapshot(
    3.9, 1572,
    ['Roasted octopus', 'Mushrooms', 'Prawns'],
    ['octopus', 'bacalhau', 'prawns', 'vegetarian options', 'wood oven'],
    'Mixed validation: the setting is popular, while food consistency receives uneven feedback.'
  ),
  'mercado-campo': snapshot(
    4.4, 2509,
    ['Oysters', 'Fresh fish', 'Sushi and Portuguese wine'],
    ['food court', 'wine', 'fish', 'sushi', 'local market', 'oysters'],
    'Broad market-level validation; individual stall quality can vary.'
  ),
  gelato: snapshot(
    4.7, 2815,
    ['Pistachio gelato', 'Tiramisu gelato', 'Hazelnut or seasonal sorbet'],
    ['gelato', 'pistachio', 'tiramisu', 'cheesecake gelato', 'hazelnut'],
    'Strong dessert validation with pistachio and tiramisu among the most repeated flavors.'
  ),
  frangasqueira: snapshot(
    4.2, 1988,
    ['Piri-piri chicken', 'Tomato salad', 'Garlic rice'],
    ['peri-peri chicken', 'whole chicken', 'spicy sauce', 'tomato salad', 'garlic rice'],
    'Chicken is strongly validated; queues, cash-only service, and very limited seating are recurring cautions.'
  ),
  'park-bar': snapshot(
    4.0, 3179,
    ['Sangria', 'Mojito', 'Beer'],
    ['sunset view', 'rooftop', '25 April Bridge', 'DJ', 'sangria', 'mojito'],
    'The view and atmosphere drive validation more than the drinks themselves.'
  ),
  'manteigaria-final': snapshot(
    4.8, 10599,
    ['Pastel de nata', 'Espresso'],
    ['pastel de nata', 'cinnamon', 'custard', 'flaky crust', 'espresso'],
    'Exceptionally high-volume validation; reviews repeatedly praise warm, crisp custard tarts.'
  )
};

export const googleReviewSnapshotsByPlaceName: Record<string, ReviewSnapshot> = {
  'O Velho Eurico': snapshot(
    4.4, 4192,
    ['Bacalhau à Brás', 'Octopus', 'Crème brûlée'],
    ['octopus', 'Portuguese food', 'bacalhau à Brás', 'duck rice', 'migas'],
    'Popular and heavily reviewed, but the wait can be long and some traditional dishes may contain pork.'
  ),
  Bonjardim: snapshot(
    4.1, 6894,
    ['Roasted piri-piri chicken', 'Creamed spinach', 'Fries'],
    ['roasted chicken', 'piri-piri chicken', 'creamed spinach', 'chicken soup'],
    'A very large review base validates it as the dependable central backup for roast chicken.'
  )
};

export function enrichTripWithGoogleReviews(trip: Trip): Trip {
  return {
    ...trip,
    cities: trip.cities.map(city => ({
      ...city,
      days: city.days.map(day => ({
        ...day,
        segments: day.segments.map(segment => {
          const metadata = segment.googlePlaceMetadata ?? googleReviewSnapshotsBySegmentId[segment.id] ?? googleReviewSnapshotsByPlaceName[segment.title];
          return {
            ...segment,
            recommendedDishes: segment.recommendedDishes,
            googlePlaceMetadata: metadata ?? segment.googlePlaceMetadata,
            alternatives: segment.alternatives.map(alternative => {
              const alternativeMetadata = alternative.metadata ?? googleReviewSnapshotsByPlaceName[alternative.name];
              return {
                ...alternative,
                recommendedDishes: alternative.recommendedDishes,
                metadata: alternativeMetadata ?? alternative.metadata
              };
            })
          };
        })
      }))
    }))
  };
}
