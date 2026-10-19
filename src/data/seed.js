import { MINUTE, HOUR, DAY, computeExpiry, computeImpact, kgPerUnit } from '../config/rules';

// Demo data so every screen has something to show. Replace with real API data later.
const orgs = [
  { id: 'd1', name: 'Grand Orchid Hotel', type: 'hotel', area: 'Bukit Jalil', address: '12 Jalan Jalil Perkasa, Bukit Jalil', distanceKm: 1.2, accepts: null, hours: 'Handover 24 hours via service entrance', about: 'Banquet and buffet surplus from weddings and conferences.' },
  { id: 'd2', name: 'Pasar Fresh Supermarket', type: 'supermarket', area: 'Sri Petaling', address: '3 Jalan Radin Bagus, Sri Petaling', distanceKm: 2.8, accepts: null, hours: 'Daily 8am to 10pm, back loading bay', about: 'Produce with cosmetic blemishes and short-dated chilled goods.' },
  { id: 'd3', name: 'Roti Kampung Bakery', type: 'restaurant', area: 'Kuchai Lama', address: '58 Jalan Kuchai Maju, Kuchai Lama', distanceKm: 4.1, accepts: null, hours: 'Daily 6am to 9pm', about: 'Neighbourhood bakery with end-of-day bread and pastries.' },
  { id: 'd4', name: 'Warung Selera Restaurant', type: 'restaurant', area: 'Taman Desa', address: '21 Jalan Desa Utama, Taman Desa', distanceKm: 5.6, accepts: null, hours: 'Daily 11am to 11pm', about: 'Malaysian rice meals, cooked fresh daily.' },
  { id: 'r1', name: 'Harapan Food Bank', type: 'food_bank', area: 'Cheras', address: '8 Jalan Manis, Cheras', distanceKm: 6.3, accepts: 'human', hours: 'Mon to Sat 9am to 6pm', about: 'Weekly food parcels for 300 families.' },
  { id: 'r2', name: 'Kasih Community Shelter', type: 'charity', area: 'Pudu', address: '44 Lorong Pudu, Pudu', distanceKm: 7.9, accepts: 'human', hours: 'Daily 7am to 9pm', about: 'Meals for 80 residents and walk-in guests.' },
  { id: 'r3', name: 'Sunrise Animal Farm', type: 'animal_farm', area: 'Semenyih', address: 'Lot 9, Jalan Ladang, Semenyih', distanceKm: 24, accepts: 'animal', hours: 'Daily 7am to 5pm', about: 'Rescue farm feeding goats, poultry and pigs.' },
];

const code = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');

function listing(now, o) {
  const readyAt = now - o.readyAgoMin * MINUTE;
  const expiresAt = computeExpiry({ categoryId: o.categoryId, readyAt, dateLabel: o.dateLabel });
  return {
    id: o.id, donorId: o.donorId, categoryId: o.categoryId, title: o.title, description: o.description || '',
    quantityTotal: o.quantity, quantityAvailable: o.available ?? o.quantity, unit: o.unit,
    quantityKg: o.quantity * kgPerUnit(o.unit), allergens: o.allergens || [], intendedUse: o.use || 'human',
    storageNote: o.storage || '', readyAt, expiresAt, createdAt: readyAt, withdrawn: false, photo: null,
  };
}

const dateIn = (days) => {
  const d = new Date(Date.now() + days * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function createSeed(now) {
  const listings = [
    listing(now, { id: 'l1', donorId: 'd1', categoryId: 'cooked_hot', title: 'Buffet leftovers: fried rice and chicken curry', quantity: 24, unit: 'portions', readyAgoMin: 25, allergens: ['Egg', 'Gluten'], storage: 'Held hot in chafing dishes.', description: 'Untouched trays from a conference lunch.' }),
    listing(now, { id: 'l2', donorId: 'd3', categoryId: 'baked', title: 'Assorted bread and pastries', quantity: 30, unit: 'items', readyAgoMin: 180, allergens: ['Gluten', 'Dairy', 'Egg'], storage: 'Boxed at room temperature.' }),
    listing(now, { id: 'l3', donorId: 'd2', categoryId: 'produce', title: 'Ripe bananas and papaya', quantity: 18, unit: 'kg', readyAgoMin: 120, use: 'both', description: 'Cosmetic blemishes only. Good for eating or feed.' }),
    listing(now, { id: 'l4', donorId: 'd4', categoryId: 'cooked_hot', title: 'Nasi lemak packs', quantity: 15, unit: 'portions', readyAgoMin: 70, allergens: ['Nuts', 'Egg'], storage: 'Individually packed, kept warm.' }),
    listing(now, { id: 'l5', donorId: 'd2', categoryId: 'dairy', title: 'Yoghurt cups, short-dated', quantity: 40, unit: 'items', readyAgoMin: 60, dateLabel: dateIn(2), allergens: ['Dairy'], storage: 'Keep chilled below 5°C.' }),
    listing(now, { id: 'l6', donorId: 'd2', categoryId: 'produce', title: 'Vegetable trimmings and bruised greens', quantity: 25, unit: 'kg', readyAgoMin: 300, use: 'animal' }),
  ];

  const claims = [];
  const recips = ['r1', 'r2', 'r1', 'r3'];
  const donors = ['d1', 'd2', 'd3', 'd4'];
  for (let i = 0; i < 12; i++) {
    const rid = recips[i % 4];
    const animal = rid === 'r3';
    const qty = 6 + ((i * 5) % 14);
    const unit = animal ? 'kg' : i % 2 ? 'items' : 'portions';
    const collectedAt = now - (i * 4.5 + 1) * DAY;
    const l = listing(now, {
      id: `h${i}`, donorId: donors[i % 4], categoryId: animal ? 'produce' : i % 2 ? 'baked' : 'cooked_hot',
      title: animal ? 'Vegetable trimmings' : i % 2 ? 'Day-old bread' : 'Cooked rice meals',
      quantity: qty, available: 0, unit, readyAgoMin: 0, use: animal ? 'animal' : 'human',
    });
    l.readyAt = collectedAt - HOUR; l.createdAt = l.readyAt; l.expiresAt = collectedAt + 2 * HOUR;
    listings.push(l);
    const kg = qty * kgPerUnit(unit);
    claims.push({
      id: `hc${i}`, listingId: l.id, recipientId: rid, quantity: qty, quantityKg: kg, status: 'collected', code: code(),
      claimedAt: collectedAt - 30 * MINUTE, deadline: collectedAt + HOUR, collectedAt, impact: computeImpact(kg),
    });
  }
  return { orgs, listings, claims };
}
