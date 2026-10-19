// Mock API backed by localStorage. Every function is async and returns plain
// objects, so swapping to the real backend means rewriting this file only.
// Each function notes the endpoint it will map to.
import {
  MINUTE, DAY, categoryById, computeExpiry, claimDeadline, computeImpact, kgPerUnit,
  canReceive, maxLimitMinutes, MAX_ACTIVE_CLAIMS, ORG_TYPES,
} from '../config/rules';
import { createSeed } from '../data/seed';

const KEY = 'sfc.db.v1';
export class ApiError extends Error {}
const fail = (m) => { throw new ApiError(m); };
const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));

let db = null;
function load() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { db = JSON.parse(raw); return db; }
  } catch { /* ignore */ }
  db = createSeed(Date.now());
  save();
  return db;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full */ }
}
export function resetDemoData() {
  localStorage.removeItem(KEY);
  db = null;
  load();
}

// The server will run this as a scheduled job. Here it runs on every read.
function sweep(now = Date.now()) {
  const d = load();
  let changed = false;
  for (const c of d.claims) {
    if (c.status === 'confirmed' && c.deadline <= now) {
      const l = d.listings.find((x) => x.id === c.listingId);
      c.status = l && c.deadline >= l.expiresAt ? 'expired' : 'no_show';
      if (l && !l.withdrawn && l.expiresAt > now) l.quantityAvailable += c.quantity;
      changed = true;
    }
  }
  if (changed) save();
  return d;
}

function deriveStatus(l, claims, now) {
  const mine = claims.filter((c) => c.listingId === l.id);
  const active = mine.filter((c) => c.status === 'confirmed').reduce((s, c) => s + c.quantity, 0);
  const collected = mine.filter((c) => c.status === 'collected').reduce((s, c) => s + c.quantity, 0);
  let status;
  if (l.withdrawn) status = 'withdrawn';
  else if (l.quantityAvailable > 0 && now < l.expiresAt) status = 'available';
  else if (active > 0) status = 'reserved';
  else if (collected > 0 && l.quantityAvailable === 0) status = 'completed';
  else status = 'expired';
  return { status, activeQty: active, collectedQty: collected };
}

const orgOf = (d, id) => d.orgs.find((o) => o.id === id);
const withRole = (o) => (o ? { ...o, role: ORG_TYPES[o.type].role } : o);

function view(l, d, now) {
  return { ...l, ...deriveStatus(l, d.claims, now), donor: withRole(orgOf(d, l.donorId)) };
}

function claimView(c, d) {
  const l = d.listings.find((x) => x.id === c.listingId);
  return { ...c, listing: l, donor: withRole(orgOf(d, l.donorId)), recipient: withRole(orgOf(d, c.recipientId)) };
}

// GET /orgs?query=&role=
export async function listOrgs({ query = '', role = '' } = {}) {
  await wait();
  const now = Date.now();
  const d = sweep(now);
  const q = query.trim().toLowerCase();
  return d.orgs
    .map(withRole)
    .filter((o) => (!role || o.role === role) && (!q || `${o.name} ${o.area} ${ORG_TYPES[o.type].label}`.toLowerCase().includes(q)))
    .map((o) => ({
      ...o,
      activeCount: d.listings.filter((l) => l.donorId === o.id && deriveStatus(l, d.claims, now).status === 'available').length,
    }));
}

// GET /orgs/:id
export async function getOrg(id) {
  await wait();
  const now = Date.now();
  const d = sweep(now);
  const org = orgOf(d, id) || fail('Organization not found.');
  const listings = d.listings.filter((l) => l.donorId === id).map((l) => view(l, d, now)).filter((l) => l.status === 'available');
  return { org: withRole(org), listings: listings.sort((a, b) => a.expiresAt - b.expiresAt) };
}

// GET /listings?query=&category=&sort=&donorId=&scope=
// scope: 'available' (browse), 'live' (available or reserved), 'past'
export async function listListings({ query = '', categoryId = '', sort = 'soonest', donorId = '', scope = 'available', receiverAccepts = '' } = {}) {
  await wait();
  const now = Date.now();
  const d = sweep(now);
  let rows = d.listings.map((l) => view(l, d, now));
  if (donorId) rows = rows.filter((r) => r.donorId === donorId);
  if (scope === 'available') rows = rows.filter((r) => r.status === 'available');
  if (scope === 'live') rows = rows.filter((r) => r.status === 'available' || r.status === 'reserved');
  if (scope === 'past') rows = rows.filter((r) => r.status !== 'available' && r.status !== 'reserved');
  if (categoryId) rows = rows.filter((r) => r.categoryId === categoryId);
  if (receiverAccepts) rows = rows.filter((r) => canReceive(receiverAccepts, r.intendedUse));
  const q = query.trim().toLowerCase();
  if (q) rows = rows.filter((r) => `${r.title} ${r.description} ${r.donor.name} ${categoryById(r.categoryId)?.label}`.toLowerCase().includes(q));
  const sorters = {
    soonest: (a, b) => a.expiresAt - b.expiresAt,
    nearest: (a, b) => a.donor.distanceKm - b.donor.distanceKm,
    newest: (a, b) => b.createdAt - a.createdAt,
  };
  return rows.sort(scope === 'past' ? sorters.newest : sorters[sort] || sorters.soonest);
}

// GET /listings/:id (claims are included for the owning donor and the viewing recipient)
export async function getListing(id, viewerOrgId) {
  await wait();
  const now = Date.now();
  const d = sweep(now);
  const l = d.listings.find((x) => x.id === id) || fail('Listing not found.');
  const v = view(l, d, now);
  const claims = d.claims
    .filter((c) => c.listingId === id && (l.donorId === viewerOrgId || c.recipientId === viewerOrgId))
    .map((c) => claimView(c, d))
    .sort((a, b) => b.claimedAt - a.claimedAt);
  return { listing: v, claims };
}

// POST /listings
export async function createListing(input, donorId) {
  await wait(250);
  const now = Date.now();
  const d = sweep(now);
  const cat = categoryById(input.categoryId);
  const title = (input.title || '').trim();
  if (title.length < 3) fail('Add a title of at least 3 characters.');
  if (!cat || !cat.enabled) fail('Choose a food category.');
  const quantity = Number(input.quantity);
  if (!(quantity > 0)) fail('Enter a quantity greater than zero.');
  if (!input.readyAt) fail('Enter when the food was ready.');
  if (input.readyAt > now + 15 * MINUTE) fail('The ready time can’t be in the future.');
  if (cat.dated && !input.dateLabel) fail('Enter the printed date.');
  const max = maxLimitMinutes(input.categoryId);
  if (max && input.limitMinutes > max) fail(`The time limit can’t be longer than ${max} minutes for this category.`);
  if (!input.allergensConfirmed) fail('Confirm the allergen list before publishing.');
  if (!input.safetyConfirmed) fail('Confirm the food has been stored safely.');
  const expiresAt = computeExpiry(input);
  if (!expiresAt || expiresAt - now < cat.bufferMinutes * MINUTE) {
    fail('There isn’t enough time left to collect this food. Check the ready time or date.');
  }
  const l = {
    id: `l${Date.now().toString(36)}`, donorId, categoryId: input.categoryId, title, description: (input.description || '').trim(),
    quantityTotal: quantity, quantityAvailable: quantity, unit: input.unit, quantityKg: quantity * kgPerUnit(input.unit),
    allergens: input.allergens || [], intendedUse: input.intendedUse || 'human', storageNote: (input.storageNote || '').trim(),
    readyAt: input.readyAt, expiresAt, createdAt: now, withdrawn: false, photo: input.photo || null,
  };
  d.listings.push(l);
  save();
  return view(l, d, now);
}

// POST /listings/:id/withdraw
export async function withdrawListing(id, donorId) {
  await wait();
  const now = Date.now();
  const d = sweep(now);
  const l = d.listings.find((x) => x.id === id && x.donorId === donorId) || fail('Listing not found.');
  d.claims.forEach((c) => { if (c.listingId === id && c.status === 'confirmed') c.status = 'cancelled'; });
  l.withdrawn = true;
  save();
  return view(l, d, now);
}

// POST /listings/:id/claims
export async function claimListing(listingId, recipientId, quantity) {
  await wait(250);
  const now = Date.now();
  const d = sweep(now);
  const l = d.listings.find((x) => x.id === listingId) || fail('Listing not found.');
  const rec = orgOf(d, recipientId) || fail('Organization not found.');
  const v = view(l, d, now);
  const cat = categoryById(l.categoryId);
  const qty = Number(quantity);
  if (v.status !== 'available') fail('This listing is no longer available.');
  if (!(qty > 0) || qty > l.quantityAvailable) fail(`Choose a quantity between 1 and ${l.quantityAvailable}.`);
  if (!canReceive(rec.accepts, l.intendedUse)) fail('This food isn’t suitable for what your organization accepts.');
  if (l.expiresAt - now < cat.bufferMinutes * MINUTE) fail('There isn’t enough time left to collect this food.');
  const open = d.claims.filter((c) => c.recipientId === recipientId && c.status === 'confirmed').length;
  if (open >= MAX_ACTIVE_CLAIMS) fail(`You can hold ${MAX_ACTIVE_CLAIMS} active claims at a time. Collect or cancel one first.`);
  const kg = qty * (l.quantityKg / l.quantityTotal);
  const claim = {
    id: `c${Date.now().toString(36)}`, listingId, recipientId, quantity: qty, quantityKg: kg, status: 'confirmed',
    code: Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join(''),
    claimedAt: now, deadline: claimDeadline(l, now), collectedAt: null, impact: null,
  };
  l.quantityAvailable -= qty;
  d.claims.push(claim);
  save();
  return claimView(claim, d);
}

// POST /claims/:id/cancel
export async function cancelClaim(id, recipientId) {
  await wait();
  const now = Date.now();
  const d = sweep(now);
  const c = d.claims.find((x) => x.id === id && x.recipientId === recipientId) || fail('Claim not found.');
  if (c.status !== 'confirmed') fail('This claim can no longer be cancelled.');
  const l = d.listings.find((x) => x.id === c.listingId);
  c.status = 'cancelled';
  if (!l.withdrawn && l.expiresAt > now) l.quantityAvailable += c.quantity;
  save();
  return claimView(c, d);
}

// POST /claims/collect { code }
export async function collectClaim(code, donorId) {
  await wait();
  const now = Date.now();
  const d = sweep(now);
  const clean = (code || '').trim().toUpperCase();
  const c = d.claims.find((x) => x.status === 'confirmed' && x.code === clean && d.listings.find((l) => l.id === x.listingId)?.donorId === donorId);
  if (!c) fail('That code doesn’t match an active claim on your listings.');
  c.status = 'collected';
  c.collectedAt = now;
  c.impact = computeImpact(c.quantityKg);
  save();
  return claimView(c, d);
}

// GET /claims?orgId=
export async function listClaims(orgId, role) {
  await wait();
  const d = sweep(Date.now());
  return d.claims
    .filter((c) => (role === 'donor' ? d.listings.find((l) => l.id === c.listingId)?.donorId === orgId : c.recipientId === orgId))
    .map((c) => claimView(c, d))
    .sort((a, b) => b.claimedAt - a.claimedAt);
}

// GET /impact/summary and /impact/timeseries
export async function getImpact(orgId, role) {
  const claims = (await listClaims(orgId, role)).filter((c) => c.status === 'collected');
  const sum = (rows) => rows.reduce((t, c) => {
    const i = c.impact || computeImpact(c.quantityKg);
    return { kg: t.kg + i.kg, meals: t.meals + i.meals, co2e: t.co2e + i.co2e, value: t.value + i.value, count: t.count + 1 };
  }, { kg: 0, meals: 0, co2e: 0, value: 0, count: 0 });
  const now = Date.now();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const weeks = [];
  for (let k = 7; k >= 0; k--) {
    const end = now - k * 7 * DAY;
    const start = end - 7 * DAY;
    const rows = claims.filter((c) => c.collectedAt > start && c.collectedAt <= end);
    weeks.push({ start, kg: sum(rows).kg });
  }
  return { total: sum(claims), month: sum(claims.filter((c) => c.collectedAt >= monthStart)), weeks };
}

// POST /listings/scan  (multipart image) -> draft listing fields.
// MOCK: replace with a call to your backend, which calls the vision model.
// The AI only suggests. It never sets shelf life and never confirms allergens.
const SAMPLES = [
  { title: 'Chicken fried rice', categoryId: 'cooked_hot', quantity: 6, unit: 'portions', allergenSuggestions: ['Egg', 'Soy'], confidence: 0.91 },
  { title: 'Sliced white bread loaves', categoryId: 'baked', quantity: 12, unit: 'items', allergenSuggestions: ['Gluten', 'Dairy'], confidence: 0.88 },
  { title: 'Mixed green salad bowls', categoryId: 'cooked_chilled', quantity: 8, unit: 'portions', allergenSuggestions: ['Nuts'], confidence: 0.84 },
  { title: '', categoryId: null, quantity: 1, unit: 'items', allergenSuggestions: [], confidence: 0.42 },
];
export async function scanFood(file) {
  await wait(1400);
  if (!file) fail('Add a photo first.');
  return SAMPLES[file.size % SAMPLES.length];
}

export async function fileToSmallDataUrl(file, max = 480) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.7);
  } finally {
    URL.revokeObjectURL(url);
  }
}
