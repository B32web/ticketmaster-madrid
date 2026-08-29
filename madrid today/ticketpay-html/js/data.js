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
  { id: "sat", label: "Day 2", weekday: "Sábado", date: "29 Ago 2026", soldOut: false },
  { id: "sun", label: "Day 3", weekday: "Domingo", date: "30 Ago 2026", soldOut: false },
];

const TIERS = [
  { id: "upper", name: "Upper", description: "Seated ticket in the upper stadium tier." },
  { id: "ga", name: "General Admission", description: "Standing ticket with general venue access." },
  { id: "golden-circle", name: "Golden Circle", description: "Standing ticket in the premium area closest to the stage." },
  { id: "premium", name: "Premium", description: "Seated ticket with a better-positioned view of the stage." },
  { id: "vip", name: "VIP", description: "Golden Circle access plus early entry and exclusive extras." },
];

// OFFICIAL PRICES (EUR)
const BASE_PRICE = {
  upper: 95,
  ga: 106,
  "golden-circle": 107,
  premium: 185,
  vip: 165,
};

// Short, price-tier-appropriate perks shown on the packages page.
// Kept deliberately brief — no repeated/circular bullet points.
const TIER_PERKS = {
  upper: ["Standard stadium access", "Digital ticket", "Event-day entry"],
  ga: ["Standing access to the general floor", "Digital ticket", "Event-day entry"],
  "golden-circle": ["Premium standing location", "Digital ticket", "Event-day entry"],
  premium: ["Better-positioned seating", "Digital ticket", "Event-day entry"],
  vip: ["Early entry before general Golden Circle", "Limited-edition gift item", "Commemorative VIP laminate", "Dedicated check-in point"],
};

// INVENTORY LIMITS (Friday sold out; Sat & Sun capped at 100 total)
const REMAINING = {
  fri: { upper: 0, ga: 0, "golden-circle": 0, premium: 0, vip: 0 },
  sat: { upper: 30, ga: 35, "golden-circle": 20, premium: 10, vip: 5 }, // total = 100
  sun: { upper: 30, ga: 35, "golden-circle": 20, premium: 10, vip: 5 }, // total = 100
};

// Group discounts (2,3,4,5+) – urgency scaled
const GROUP_DISCOUNTS = [
  { min: 2, rate: 0.03, label: "Grupo de 2 · 3% dto." },
  { min: 3, rate: 0.05, label: "Grupo de 3 · 5% dto." },
  { min: 4, rate: 0.08, label: "Grupo de 4 · 8% dto." },
  { min: 5, rate: 0.10, label: "Grupo de 5+ · 10% dto." }
];

// Multi-day bundle discounts (2-day, 3-day) – kept
const BUNDLE_DISCOUNTS = [
  { days: 3, rate: 0.20, label: "Pase 3 Días · 20% dto." },
  { days: 2, rate: 0.10, label: "Pase 2 Días · 10% dto." },
];

// Returns the BEST (highest) group-discount rate a quantity qualifies for.
// GROUP_DISCOUNTS is ordered ascending by `min`, so a naive .find() would
// stop at the first (lowest) tier a qty satisfies — this checks all of them.
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
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

function calculatePrice(selection) {
  const lines = selection.filter((l) => l.qty > 0);
  const distinctDays = new Set(lines.map((l) => l.day)).size;

  const subtotal = lines.reduce((sum, l) => sum + BASE_PRICE[l.tier] * l.qty, 0);

  let discountRate = 0;
  let discountLabel = null;

  const bundle = BUNDLE_DISCOUNTS.find((b) => distinctDays >= b.days);
  if (bundle) {
    discountRate = bundle.rate;
    discountLabel = bundle.label;
  } else {
    const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
    const group = bestGroupDiscount(totalQty);
    if (group) {
      discountRate = group.rate;
      discountLabel = group.label;
    }
  }

  const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
  const total = Math.round((subtotal - discountAmount) * 100) / 100;

  return {
    subtotal,
    discountLabel,
    discountAmount,
    total,
    lines: lines.map((l) => ({
      label: `${l.qty}× ${TIERS.find((t) => t.id === l.tier).name} · ${DAYS.find((d) => d.id === l.day).weekday}`,
      amount: BASE_PRICE[l.tier] * l.qty,
    })),
  };
}

/* =========================================================
   LIVE INVENTORY — persisted in localStorage, deducted on
   every completed purchase. Group orders (2+ seats in one
   order) draw from a small, scarce "group slot" pool on top
   of the normal per-day ticket count, so group availability
   runs out fast and on purpose.
   ========================================================= */
const INVENTORY_KEY = "ticketmaster.demo.inventory";
const GROUP_SLOTS_PER_DAY = 7; // scarce on purpose — max 7 group orders per day

function defaultInventory() {
  return {
    sat: { total: 100, remaining: 100, groupTotal: GROUP_SLOTS_PER_DAY, groupRemaining: GROUP_SLOTS_PER_DAY },
    sun: { total: 100, remaining: 100, groupTotal: GROUP_SLOTS_PER_DAY, groupRemaining: GROUP_SLOTS_PER_DAY },
  };
}

let _inventoryMemory = null;

function loadInventory() {
  try {
    const saved = JSON.parse(localStorage.getItem(INVENTORY_KEY));
    if (saved && saved.sat && saved.sun) return saved;
  } catch (e) {}
  if (_inventoryMemory) return _inventoryMemory;
  const fresh = defaultInventory();
  saveInventory(fresh);
  return fresh;
}

function saveInventory(inv) {
  _inventoryMemory = inv; // in-memory fallback for this page load
  try {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
  } catch (e) {
    // Storage blocked (Safari Private Browsing, some in-app browsers, etc.)
    // — purchase still completes for this session, just isn't persisted.
  }
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

// A ticket order of 2+ seats is a "group" and draws one scarce group slot.
function isGroupQty(qty) {
  return qty >= 2;
}

// Attempts to reserve `qty` tickets for `dayId`. Only call this once a
// purchase actually completes (payment succeeds) — never on mere selection.
// Returns { ok, isGroup, reason, remainingAfter, groupRemainingAfter }
function reserveTickets(dayId, qty) {
  const inv = loadInventory();
  const day = inv[dayId];
  if (!day) return { ok: false, reason: "That date isn't available." };
  if (qty <= 0) return { ok: false, reason: "No tickets selected." };
  if (qty > day.remaining) {
    return { ok: false, reason: "Tickets over — only " + day.remaining + " left for this date." };
  }
  const group = isGroupQty(qty);
  if (group && day.groupRemaining <= 0) {
    return { ok: false, reason: "No group tickets remaining for this date (max " + GROUP_SLOTS_PER_DAY + " group orders/day)." };
  }
  day.remaining -= qty;
  if (group) day.groupRemaining -= 1;
  saveInventory(inv);
  return { ok: true, isGroup: group, remainingAfter: day.remaining, groupRemainingAfter: day.groupRemaining };
}

// UI helper: returns { text, className } for a "tickets remaining" readout.
function remainingDisplay(remaining, label) {
  label = label || "tickets";
  if (remaining <= 0) return { text: label.charAt(0).toUpperCase() + label.slice(1) + " over", className: "inv-over" };
  if (remaining < 3) return { text: "Only " + remaining + " " + label + " left", className: "inv-low" };
  return { text: remaining + " " + label + " available", className: "inv-ok" };
}