/* =========================================================
   TICKETMASTER — Supabase Integration (store.js)
   ========================================================= */
const supabaseUrl = 'https://crixlmnrpbjxcflcxpbf.supabase.co';
const supabaseAnonKey = 'sb_publishable_rbE4Y8tl9HMPwe8Wh60yaA_MF5yGq9P';
const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

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

const Auth = {
  async get() { const { data: { user } } = await supabase.auth.getUser(); return user; },
  async signUp(name, email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    return { data, error };
  },
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },
  async signOut() { await supabase.auth.signOut(); }
};

const Orders = {
  async all() {
    const user = await Auth.get();
    if (!user) return [];
    const { data, error } = await supabase.from('orders').select('*').eq('user_id', user.id);
    return data || [];
  },
  async add(order) {
    const user = await Auth.get();
    if (!user) return null;
    const { data, error } = await supabase.from('orders').insert({
      user_id: user.id, total: order.total, payment_method: order.method, metadata: order
    }).select('id');
    if (error) { console.error(error); return null; }
    return data[0];
  }
};

async function renderHeaderAuth() {
  const user = await Auth.get();
  const slot = document.getElementById("header-auth-slot");
  if (!slot) return;
  if (user) {
    slot.innerHTML = `<a class="header-user" href="account.html">${user.user_metadata?.name || user.email}</a>`;
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
