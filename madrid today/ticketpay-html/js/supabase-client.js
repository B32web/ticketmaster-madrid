/* =========================================================
   SUPABASE INTEGRATION SCAFFOLD
   =========================================================
   This file is a starting point for connecting this front-end
   to a real Supabase backend. It does NOT change any current
   behavior — the site keeps working exactly as it does now
   (localStorage-based Cart / Auth / Orders in store.js) until
   you deliberately wire these functions in.

   To activate:
   1. Create a project at https://supabase.com
   2. Replace SUPABASE_URL and SUPABASE_ANON_KEY below with your
      project's values (Project Settings → API).
   3. Create tables matching the shapes used here: profiles,
      orders, order_lines (see comments on each function).
   4. Swap the relevant Cart/Auth/Orders calls in store.js and
      checkout.js for the matching function below, one at a time,
      testing as you go.
   ========================================================= */

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL"; // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const supabaseConfigured =
  typeof window.supabase !== "undefined" &&
  SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

// Only creates a real client once you've filled in real credentials above.
// Until then, `db` stays null and every helper below safely no-ops.
const db = supabaseConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/* ---------------------------------------------------------
   AUTH — mirrors Auth.signUp / Auth.signIn / Auth.signOut in store.js
   --------------------------------------------------------- */
async function supabaseSignUp(name, email, password) {
  if (!db) return { error: "Supabase not configured yet" };
  const { data, error } = await db.auth.signUp({ email, password, options: { data: { name } } });
  return { data, error };
}

async function supabaseSignIn(email, password) {
  if (!db) return { error: "Supabase not configured yet" };
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function supabaseSignOut() {
  if (!db) return;
  await db.auth.signOut();
}

/* ---------------------------------------------------------
   ORDERS / TICKETS — mirrors Orders.add / Orders.all in store.js
   Expected tables:
     orders(id, user_id, code, event_summary, total, method, created_at)
     order_lines(id, order_id, day, tier, code, row, seat_number,
                 section_name, tier_label, price, is_group, group_size)
   --------------------------------------------------------- */
async function supabaseSaveOrder(order) {
  if (!db) return { error: "Supabase not configured yet" };
  const { data: userData } = await db.auth.getUser();
  const userId = userData?.user?.id || null;

  const { data: orderRow, error: orderError } = await db
    .from("orders")
    .insert({
      user_id: userId,
      code: order.code,
      event_summary: order.summary,
      total: order.total,
      method: order.method,
    })
    .select()
    .single();
  if (orderError) return { error: orderError };

  const lines = order.lines.map((l) => ({ ...l, order_id: orderRow.id }));
  const { error: linesError } = await db.from("order_lines").insert(lines);
  if (linesError) return { error: linesError };

  return { data: orderRow };
}

async function supabaseGetOrders() {
  if (!db) return [];
  const { data, error } = await db
    .from("orders")
    .select("*, order_lines(*)")
    .order("created_at", { ascending: false });
  if (error) return [];
  return data;
}

/* ---------------------------------------------------------
   INVENTORY — mirrors reserveTickets / getDayInventory in data.js
   Expected table: inventory(day_id, remaining, group_remaining)
   In production this reservation should really happen in a
   Supabase Edge Function (server-side) so two people can't both
   grab the last seat at once — this client-side version is only
   safe for a single-user demo.
   --------------------------------------------------------- */
async function supabaseGetDayInventory(dayId) {
  if (!db) return null;
  const { data, error } = await db.from("inventory").select("*").eq("day_id", dayId).single();
  if (error) return null;
  return data;
}
