/**
 * Broad, globally-applicable cuisine taxonomy. CRTQ is a worldwide app, so
 * places are categorized into a general set that works in any city and lines
 * up with how Google Places labels venues — rather than the hyper-local
 * sub-cuisines the pilot started with (Tacos, Mole, Antojitos, Yucateca…).
 */

/** The canonical cuisine vocabulary the app sorts and filters by. */
export const CUISINES = [
  'Mexican',
  'Italian',
  'Japanese',
  'Chinese',
  'Thai',
  'Indian',
  'Korean',
  'Mediterranean',
  'French',
  'Spanish',
  'American',
  'Seafood',
  'Steakhouse',
  'Pizza',
  'Burgers',
  'BBQ',
  'Vegetarian',
  'Bakery',
  'Café',
  'Bar',
  'Street Food',
  'Desserts',
  'Brunch',
  'Fine Dining',
  'Contemporary',
] as const;

/** A friendly subset surfaced in the taste picker and passport tags. */
export const TASTE_CUISINES = [
  'Mexican',
  'Italian',
  'Japanese',
  'Seafood',
  'Bakery',
  'Café',
  'Street Food',
  'Bar',
  'Desserts',
  'Mediterranean',
  'Vegetarian',
  'Fine Dining',
];

/** Google Places `types` → one broad cuisine. Covers the cuisine-specific
 *  place types the Places API returns; falls through to a sensible default. */
const GOOGLE_CUISINE: Record<string, string> = {
  mexican_restaurant: 'Mexican',
  italian_restaurant: 'Italian',
  pizza_restaurant: 'Pizza',
  japanese_restaurant: 'Japanese',
  sushi_restaurant: 'Japanese',
  ramen_restaurant: 'Japanese',
  chinese_restaurant: 'Chinese',
  thai_restaurant: 'Thai',
  indian_restaurant: 'Indian',
  korean_restaurant: 'Korean',
  vietnamese_restaurant: 'Vietnamese',
  mediterranean_restaurant: 'Mediterranean',
  greek_restaurant: 'Mediterranean',
  lebanese_restaurant: 'Mediterranean',
  turkish_restaurant: 'Mediterranean',
  middle_eastern_restaurant: 'Mediterranean',
  french_restaurant: 'French',
  spanish_restaurant: 'Spanish',
  american_restaurant: 'American',
  hamburger_restaurant: 'Burgers',
  fast_food_restaurant: 'Street Food',
  seafood_restaurant: 'Seafood',
  steak_house: 'Steakhouse',
  barbecue_restaurant: 'BBQ',
  brazilian_restaurant: 'BBQ',
  vegetarian_restaurant: 'Vegetarian',
  vegan_restaurant: 'Vegetarian',
  breakfast_restaurant: 'Brunch',
  brunch_restaurant: 'Brunch',
  bakery: 'Bakery',
  cafe: 'Café',
  coffee_shop: 'Café',
  bar: 'Bar',
  pub: 'Bar',
  wine_bar: 'Bar',
  bar_and_grill: 'Bar',
  meal_takeaway: 'Street Food',
  meal_delivery: 'Street Food',
  ice_cream_shop: 'Desserts',
  dessert_shop: 'Desserts',
  dessert_restaurant: 'Desserts',
  fine_dining_restaurant: 'Fine Dining',
};

/** Best broad cuisine for a Google Places result's `types` array. */
export function cuisineFromGoogleTypes(types: string[] = []): string {
  for (const t of types) if (GOOGLE_CUISINE[t]) return GOOGLE_CUISINE[t];
  return 'Restaurant';
}
