/* =========================================================
   TICKETMASTER — shared data & pricing engine
   ========================================================= */

const EVENT = {
  title: "The Weeknd",
  tour: "After Hours Til Dawn Tour",
  guest: "Playboi Carti",
  venue: "Riyadh Air Metropolitano",
  city: "Madrid, Spain",
};

const DAYS = [
  { id: "fri", label: "Day 1", weekday: "Viernes", date: "28 Ago 2026", soldOut: true },
  { id: "sat", label: "Day 2", weekday: "Sábado", date: "29 Ago 2026", soldOut: true },
  { id: "sun", label: "Day 3", weekday: "Domingo", date: "30 Ago 2026", soldOut: false },
];

const TIERS = [
  { id: "grada-alta-1", name: "Grada Alta", description: "Upper grandstand seating", price: 53.50, discount: 1.50, remaining: 7 },
  { id: "grada-alta-2", name: "Grada Alta", description: "Upper grandstand seating", price: 63.00, discount: 2.00, remaining: 5 },
  { id: "grada-alta-3", name: "Grada Alta", description: "Upper grandstand seating", price: 74.00, discount: 1.00, remaining: 4 },
  { id: "grada-alta-4", name: "Grada Alta", description: "Upper grandstand seating", price: 78.50, discount: 1.50, remaining: 4 },
  { id: "grada-alta-5", name: "Grada Alta", description: "Upper grandstand seating", price: 90.00, discount: 2.00, remaining: 3 },
  { id: "grada-alta-6", name: "Grada Alta", description: "Upper grandstand seating", price: 94.50, discount: 1.50, remaining: 2 },
  { id: "pista-1", name: "Pista", description: "Standing floor", price: 87.50, discount: 1.50, remaining: 5 },
  { id: "pista-2", name: "Pista", description: "Standing floor", price: 113.00, discount: 2.00, remaining: 3 },
  { id: "grada-baja-1", name: "Grada Baja", description: "Lower grandstand seating", price: 95.50, discount: 1.50, remaining: 3 },
  { id: "gold-circle-este", name: "Gold Circle Este", description: "Premium standing", price: 97.00, discount: 2.00, remaining: 3 },
  { id: "gold-circle-oeste", name: "Gold Circle Oeste", description: "Premium standing", price: 108.50, discount: 1.50, remaining: 2 },
];

const BASE_PRICE = Object.fromEntries(TIERS.map(t => [t.id, t.price]));
const TIER_PERKS = Object.fromEntries(TIERS.map(t => [t.id, ["Digital ticket", "Event-day entry"]]));

const REMAINING = {
  fri: Object.fromEntries(TIERS.map(t => [t.id, 0])),
  sat: Object.fromEntries(TIERS.map(t => [t.id, 0])),
  sun: Object.fromEntries(TIERS.map(t => [t.id, t.remaining])),
};

const GROUP_DISCOUNTS = [
  { min: 2, rate: 0.03, label: "Grupo de 2 · 3% dto." },
  { min: 3, rate: 0.05, label: "Grupo de 3 · 5% dto." },
  { min: 4, rate: 0.08, label: "Grupo de 4 · 8% dto." },
  { min: 5, rate: 0.10, label: "Grupo de 5+ · 10% dto." }
];

const BUNDLE_DISCOUNTS = [
  { days: 3, rate: 0.20, label: "Pase 3 Días · 20% dto." },
  { days: 2, rate: 0.10, label: "Pase 2 Días · 10% dto." },
];

function bestGroupRate(qty) {
  return GROUP_DISCOUNTS.reduce((best, g) => (qty >= g.min && g.rate > best ? g.rate : best), 0);
}
function bestGroupDiscount(qty) {
  let winner = null;
  GROUP_DISCOUNTS.forEach((g) => {
    if (qty >= g.min && (!winner || g.rate > winner.rate)) winner = g;
  });
  return winner;
}

function pricePerTicketAtQty(tierId, qty) {
  const rate = bestGroupRate(qty);
  return Math.round(BASE_PRICE[tierId] * (1 - rate) * 100) / 100;
}

function getBundleRate(numDays) {
  const b = BUNDLE_DISCOUNTS.find((x) => numDays >= x.days);
  return b ? b.rate : 0;
}

function packagePricePerPerson(tierId, dayIds) {
  const subtotal = dayIds.reduce((sum, d) => sum + BASE_PRICE[tierId], 0);
  const rate = getBundleRate(dayIds.length);
  return Math.round(subtotal * (1 - rate) * 100) / 100;
}

function packageRemaining(tierId, dayIds) {
  const anySoldOut = dayIds.some((d) => DAYS.find((day) => day.id === d).soldOut);
  if (anySoldOut) return 0;
  return Math.min(...dayIds.map((d) => REMAINING[d][tierId]));
}

function formatEUR(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);
}

function calculatePrice(selection) {
  const lines = selection.filter((l) => l.qty > 0);
  const distinctDays = new Set(lines.map((l) => l.day)).size;
  const subtotal = lines.reduce((sum, l) => sum + BASE_PRICE[l.tier] * l.qty, 0);
  let discountRate = 0, discountLabel = null;
  const bundle = BUNDLE_DISCOUNTS.find((b) => distinctDays >= b.days);
  if (bundle) {
    discountRate = bundle.rate; discountLabel = bundle.label;
  } else {
    const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
    const group = bestGroupDiscount(totalQty);
    if (group) { discountRate = group.rate; discountLabel = group.label; }
  }
  const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
  const total = Math.round((subtotal - discountAmount) * 100) / 100;
  return {
    subtotal, discountLabel, discountAmount, total,
    lines: lines.map((l) => ({ label: `${l.qty}× ${TIERS.find((t) => t.id === l.tier).name} · ${DAYS.find((d) => d.id === l.day).weekday}`, amount: BASE_PRICE[l.tier] * l.qty }))
  };
}

const INVENTORY_KEY = "ticketmaster.demo.inventory";
const GROUP_SLOTS_PER_DAY = 7;

function defaultInventory() {
  const sunRemaining = TIERS.reduce((sum, t) => sum + t.remaining, 0); // 41
  return {
    fri: { total: 0, remaining: 0, groupTotal: GROUP_SLOTS_PER_DAY, groupRemaining: GROUP_SLOTS_PER_DAY },
    sat: { total: 0, remaining: 0, groupTotal: GROUP_SLOTS_PER_DAY, groupRemaining: GROUP_SLOTS_PER_DAY },
    sun: { total: sunRemaining, remaining: sunRemaining, groupTotal: GROUP_SLOTS_PER_DAY, groupRemaining: GROUP_SLOTS_PER_DAY },
  };
}

let _inventoryMemory = null;

function loadInventory() {
  try {
    const saved = JSON.parse(localStorage.getItem(INVENTORY_KEY));
    if (saved && saved.sun) return saved;
  } catch (e) {}
  if (_inventoryMemory) return _inventoryMemory;
  const fresh = defaultInventory();
  saveInventory(fresh);
  return fresh;
}

function saveInventory(inv) {
  _inventoryMemory = inv;
  try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv)); } catch (e) {}
}

function getDayInventory(dayId) {
  const inv = loadInventory();
  return inv[dayId] || null;
}

function resetInventory() {
  const fresh = defaultInventory();
  saveInventory(fresh);
  return fresh;
}

function isGroupQty(qty) {
  return qty >= 2;
}

function reserveTickets(dayId, qty) {
  const inv = loadInventory();
  const day = inv[dayId];
  if (!day) return { ok: false, reason: "That date isn't available." };
  if (qty <= 0) return { ok: false, reason: "No tickets selected." };
  if (qty > day.remaining) return { ok: false, reason: "Tickets over — only " + day.remaining + " left for this date." };
  const group = isGroupQty(qty);
  if (group && day.groupRemaining <= 0) return { ok: false, reason: "No group tickets remaining for this date (max " + GROUP_SLOTS_PER_DAY + " group orders/day)." };
  day.remaining -= qty;
  if (group) day.groupRemaining -= 1;
  saveInventory(inv);
  return { ok: true, isGroup: group, remainingAfter: day.remaining, groupRemainingAfter: day.groupRemaining };
}

function remainingDisplay(remaining, label) {
  label = label || "tickets";
  if (remaining <= 0) return { text: label.charAt(0).toUpperCase() + label.slice(1) + " over", className: "inv-over" };
  if (remaining < 3) return { text: "Only " + remaining + " " + label + " left", className: "inv-low" };
  return { text: remaining + " " + label + " available", className: "inv-ok" };
}
