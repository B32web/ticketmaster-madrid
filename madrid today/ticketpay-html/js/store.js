/* =========================================================
   TICKETMASTER — cart & auth state
   ========================================================= */

const CART_KEY = "ticketmaster.demo.selection";
const USER_KEY = "ticketmaster.demo.user";
const ORDERS_KEY = "ticketmaster.demo.orders";
const SEATS_KEY = "ticketmaster.demo.seats";
const PACKAGE_KEY = "ticketmaster.demo.package";

// Some browsers/contexts (Safari Private Browsing, in-app browsers from
// social apps, some managed/corporate phones) block or throw on
// localStorage access entirely. Every read/write goes through this wrapper
// so a storage failure degrades gracefully (in-memory for this page load)
// instead of throwing and breaking whatever button the person just clicked.
const _memoryStore = {};
const safeStorage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return key in _memoryStore ? _memoryStore[key] : null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      _memoryStore[key] = value; // still works for the rest of this page load
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      delete _memoryStore[key];
    }
  },
};

const Cart = {
  get() {
    try { return JSON.parse(safeStorage.get(CART_KEY)) || []; } catch { return []; }
  },
  setQty(day, tier, qty) {
    const selection = Cart.get().filter((l) => !(l.day === day && l.tier === tier));
    if (qty > 0) selection.push({ day, tier, qty });
    safeStorage.set(CART_KEY, JSON.stringify(selection));
    return selection;
  },
  getQty(day, tier) {
    const line = Cart.get().find((l) => l.day === day && l.tier === tier);
    return line ? line.qty : 0;
  },
  clear() { safeStorage.remove(CART_KEY); },

  // New: seat selection methods
  setSeats(seatList) {
    safeStorage.set(SEATS_KEY, JSON.stringify(seatList));
  },
  getSeats() {
    try { return JSON.parse(safeStorage.get(SEATS_KEY)) || []; } catch { return []; }
  },
  clearSeats() {
    safeStorage.remove(SEATS_KEY);
  },

  // Package context: which day + tier the person picked before the seat map
  setPackage(pkg) {
    safeStorage.set(PACKAGE_KEY, JSON.stringify(pkg));
  },
  getPackage() {
    try { return JSON.parse(safeStorage.get(PACKAGE_KEY)) || null; } catch { return null; }
  },
  clearPackage() {
    safeStorage.remove(PACKAGE_KEY);
  }
};

const Auth = {
  get() {
    try { return JSON.parse(safeStorage.get(USER_KEY)); } catch { return null; }
  },
  signUp(name, email) {
    const user = { name, email };
    safeStorage.set(USER_KEY, JSON.stringify(user));
    return user;
  },
  signIn(email) {
    const user = { name: email.split("@")[0], email };
    safeStorage.set(USER_KEY, JSON.stringify(user));
    return user;
  },
  signOut() { safeStorage.remove(USER_KEY); },
};

const Orders = {
  all() {
    try { return JSON.parse(safeStorage.get(ORDERS_KEY)) || []; } catch { return []; }
  },
  add(order) {
    const orders = Orders.all();
    orders.unshift(order);
    safeStorage.set(ORDERS_KEY, JSON.stringify(orders));
    return order;
  },
};

// Reflect auth state in header
function renderHeaderAuth() {
  const user = Auth.get();
  const slot = document.getElementById("header-auth-slot");
  if (!slot) return;
  if (user) {
    slot.innerHTML = `<a class="header-user" href="account.html">${user.name || user.email}</a>`;
  } else {
    slot.innerHTML = `
      <a class="header-login" href="login.html">Login</a>
      <a class="btn btn-light btn-sm" href="signup.html">Sign up</a>
    `;
  }
}

// Language initialization
function initLanguage() {
  const lang = safeStorage.get('tm_lang') || 'es';
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeaderAuth();
  initLanguage();
});