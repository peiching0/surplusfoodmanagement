// Business rules in one place. Admins will manage these server-side later;
// the frontend uses them for previews and validation only. The server is the
// source of truth for every expiry timestamp.

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

// Placeholder values: validate with a food-safety expert before launch.
export const CATEGORIES = [
  { id: 'cooked_hot', label: 'Cooked hot meals', short: 'Hot meal', shelfMinutes: 90, claimWindowMinutes: 45, bufferMinutes: 20, color: '#E8B08A', note: 'Keep hot until handover.', enabled: true },
  { id: 'cooked_chilled', label: 'Chilled meals and salads', short: 'Chilled', shelfMinutes: 240, claimWindowMinutes: 90, bufferMinutes: 30, color: '#A9CBD9', note: 'Keep chilled until handover.', enabled: true },
  { id: 'baked', label: 'Baked goods', short: 'Baked', shelfMinutes: 1440, claimWindowMinutes: 240, bufferMinutes: 30, color: '#E6C98F', enabled: true },
  { id: 'produce', label: 'Fresh fruit and vegetables', short: 'Produce', shelfMinutes: 2880, claimWindowMinutes: 480, bufferMinutes: 30, color: '#A8CF9E', enabled: true },
  { id: 'dairy', label: 'Dairy and chilled packaged', short: 'Dairy', dated: true, claimWindowMinutes: 480, bufferMinutes: 60, color: '#D9D3EE', note: 'Expires at the end of the printed use-by date.', enabled: true },
  { id: 'packaged', label: 'Packaged and dry goods', short: 'Packaged', dated: true, claimWindowMinutes: 480, bufferMinutes: 60, color: '#CFC8B8', note: 'Expires at the end of the printed best-before date.', enabled: true },
  // Product decision pending: allow raw meat and seafood in the MVP?
  { id: 'raw', label: 'Raw meat and seafood', short: 'Raw', shelfMinutes: 240, claimWindowMinutes: 90, bufferMinutes: 30, color: '#E3A3A3', enabled: false },
];

export const categoryById = (id) => CATEGORIES.find((c) => c.id === id);

export const ORG_TYPES = {
  restaurant: { label: 'Restaurant', role: 'donor' },
  hotel: { label: 'Hotel', role: 'donor' },
  supermarket: { label: 'Supermarket', role: 'donor' },
  charity: { label: 'Charity', role: 'recipient' },
  food_bank: { label: 'Food bank', role: 'recipient' },
  animal_farm: { label: 'Animal farm', role: 'recipient' },
};

export const UNITS = [
  { id: 'portions', label: 'portions', kg: 0.35 },
  { id: 'items', label: 'items', kg: 0.25 },
  { id: 'trays', label: 'trays', kg: 2.5 },
  { id: 'kg', label: 'kg', kg: 1 },
];
export const kgPerUnit = (unit) => UNITS.find((u) => u.id === unit)?.kg ?? 0.3;

export const ALLERGENS = ['Nuts', 'Dairy', 'Gluten', 'Egg', 'Soy', 'Shellfish'];

export const USES = [
  { id: 'human', label: 'People' },
  { id: 'animal', label: 'Animal feed' },
  { id: 'both', label: 'Either' },
];

export const MAX_ACTIVE_CLAIMS = 3;

// Estimates only: keep configurable and cite sources once agreed.
export const IMPACT = { kgPerMeal: 0.4, co2ePerKg: 2.5, valuePerKg: 12, currency: 'RM' };

export function computeImpact(kg) {
  return {
    kg,
    meals: kg / IMPACT.kgPerMeal,
    co2e: kg * IMPACT.co2ePerKg,
    value: kg * IMPACT.valuePerKg,
  };
}

export function canReceive(accepts, use) {
  return accepts === 'both' || use === 'both' || accepts === use;
}

// expires_at = ready_at + shelf life (or end of the printed date for dated goods).
// Donors may shorten the limit, never extend it.
export function computeExpiry({ categoryId, readyAt, dateLabel, limitMinutes }) {
  const cat = categoryById(categoryId);
  if (!cat || !readyAt) return null;
  let expires;
  if (cat.dated) {
    if (!dateLabel) return null;
    const [y, m, d] = dateLabel.split('-').map(Number);
    expires = new Date(y, m - 1, d, 23, 59, 0).getTime();
  } else {
    expires = readyAt + cat.shelfMinutes * MINUTE;
  }
  if (limitMinutes && limitMinutes > 0) {
    expires = Math.min(expires, readyAt + limitMinutes * MINUTE);
  }
  return expires;
}

export function maxLimitMinutes(categoryId) {
  const cat = categoryById(categoryId);
  return cat && !cat.dated ? cat.shelfMinutes : null;
}

export const claimDeadline = (listing, now) => {
  const cat = categoryById(listing.categoryId);
  return Math.min(listing.expiresAt, now + (cat?.claimWindowMinutes ?? 60) * MINUTE);
};
