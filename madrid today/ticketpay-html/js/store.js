/* =========================================================
   TICKETMASTER — Local identity (store.js)
   =========================================================
   CHANGED (requested): login/signup are not meant to "authenticate" or
   restrict anyone — their only job is to learn a name to greet you with
   and give you a personal ticket dashboard. That's incompatible with a
   real backend auth call, which validates email format, enforces a
   minimum password length, and takes a real network round trip (that
   was the source of the delay and the validation you didn't want).
   So this now just remembers your name on this device — instantly,
   with nothing checked. No Supabase client is created here anymore.
   ========================================================= */

// Cart (localStorage for demo)
const CART_KEY = "ticketmaster.demo.selection";
const SEATS_KEY = "ticketmaster.demo.seats";
const PACKAGE_KEY = "ticketmaster.demo.package";
const Cart = {
  get() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } },
  setQty(day, tier, qty) {
    const selection = Cart.get().filter(l => !(l.day === day && l.tier === tier));
    if (qty > 0) selection.push({ day, tier, qty });
    localStorage.setItem(CART_KEY, JSON.stringify(selection));
    return selection;
  },
  getQty(day, tier) {
    const line = Cart.get().find(l => l.day === day && l.tier === tier);
    return line ? line.qty : 0;
  },
  clear() { localStorage.removeItem(CART_KEY); },
  setSeats(seatList) { localStorage.setItem(SEATS_KEY, JSON.stringify(seatList)); },
  getSeats() { try { return JSON.parse(localStorage.getItem(SEATS_KEY)) || []; } catch { return []; } },
  clearSeats() { localStorage.removeItem(SEATS_KEY); },
  setPackage(pkg) { localStorage.setItem(PACKAGE_KEY, JSON.stringify(pkg)); },
  getPackage() { try { return JSON.parse(localStorage.getItem(PACKAGE_KEY)); } catch { return null; } },
  clearPackage() { localStorage.removeItem(PACKAGE_KEY); }
};

// --- Local identity: the whole point is "know your name", nothing else ---
const IDENTITY_KEY = "ticketmaster.demo.identity";

function saveIdentity(identity) {
  try { localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity)); } catch (e) {}
  return identity;
}

function makeIdentity(name, email) {
  return {
    id: "local_" + Math.random().toString(36).slice(2, 10),
    name: (name || "").trim() || "Guest",
    email: (email || "").trim()
  };
}

const Auth = {
  // Returns whoever is currently "signed in" on this device, or null.
  async get() {
    try {
      const raw = localStorage.getItem(IDENTITY_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  // Instant, nothing validated: whatever name/email/password you typed,
  // this just remembers your name and signs you in immediately.
  async signUp(name, email, password) {
    const identity = saveIdentity(makeIdentity(name, email));
    return { data: { user: identity }, error: null };
  },
  // Same as signUp, deliberately — login isn't meant to gatekeep here,
  // it just (re)establishes who you are on this device, instantly.
  async signIn(name, email, password) {
    const identity = saveIdentity(makeIdentity(name, email));
    return { data: { user: identity }, error: null };
  },
  async signOut() {
    localStorage.removeItem(IDENTITY_KEY);
  }
};

// --- Orders: kept local too, since they're looked up by the local identity above ---
const ORDERS_KEY = "ticketmaster.demo.orders";
function loadOrders() {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; } catch (e) { return []; }
}
function saveOrders(orders) {
  try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); } catch (e) {}
}
const Orders = {
  async all() {
    const user = await Auth.get();
    if (!user) return [];
    return loadOrders().filter(o => o.user_id === user.id);
  },
  async add(order) {
    const user = await Auth.get();
    if (!user) return null;
    const record = { id: "ord_" + Math.random().toString(36).slice(2, 10), user_id: user.id, total: order.total, payment_method: order.method, metadata: order };
    const orders = loadOrders();
    orders.push(record);
    saveOrders(orders);
    return record;
  }
};

async function renderHeaderAuth() {
  const user = await Auth.get();
  const slot = document.getElementById("header-auth-slot");
  if (!slot) return;
  if (user) {
    slot.innerHTML = `<a class="header-user" href="account.html">${user.name || user.email}</a>`;
  } else {
    slot.innerHTML = `<a class="header-login" href="login.html">Login</a><a class="btn btn-light btn-sm" href="signup.html">Sign up</a>`;
  }
}
function initLanguage() {
  const lang = localStorage.getItem('tm_lang') || 'es';
  document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
}
document.addEventListener("DOMContentLoaded", () => {
  renderHeaderAuth();
  initLanguage();
});
