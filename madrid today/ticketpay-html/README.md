# TicketPay — Design Preview (The Weeknd · Madrid)

A polished, front-end-only ticketing site built as a **design/portfolio preview**.
Plain HTML/CSS/JS — no build step, no dependencies. Open `index.html` in a
browser, or serve the folder with any static file server.

## What this is

- A fully designed ticketing product: home, event page, login/signup,
  account dashboard, checkout, and a digital "My Tickets" page.
- Live UI, real interactivity: multi-day selection, per-tier quantity
  pickers, automatic group-size and multi-day bundle discounts, a
  reservation countdown, and a simulated payment flow.
- All data — accounts, cart, orders — lives in **browser localStorage**.
  Nothing is sent to a server anywhere in this build.

## What this is NOT

- **Not a live ticket seller.** It is not connected to a payment
  processor, has no real ticket inventory, and is not affiliated with
  or authorized by any artist, venue, or promoter shown on the site.
- **Not production-ready as-is.** Every price, discount, and "remaining"
  count in `js/data.js` is placeholder demo data — edit it freely.

## File structure

```
ticketpay-html/
├── index.html          Home page
├── event.html           Madrid event page + ticket selector
├── login.html            Log in
├── signup.html           Create account
├── account.html          Dashboard (orders, stats)
├── checkout.html         Payment step (simulated)
├── tickets.html          Digital tickets ("My Tickets")
├── css/
│   ├── base.css          Design tokens, header/footer, buttons
│   └── pages.css         Page-specific layout & components
├── js/
│   ├── data.js            Event/day/tier data + pricing engine
│   ├── store.js           Cart / Auth / Orders (localStorage)
│   ├── event.js           Event page interactivity
│   └── checkout.js        Checkout flow (simulated payment)
└── images/                All photos used across the site
```

## Editing the pricing model

Open `js/data.js`:

- `BASE_PRICE` — price per ticket, per tier (General / Premium / VIP)
- `REMAINING` — "tickets remaining" shown per day, per tier
- `GROUP_DISCOUNTS` — discount for buying 3 / 4 / 5+ tickets in one night
- `BUNDLE_DISCOUNTS` — discount for buying a 2-day or 3-day pass

The pricing engine (`calculatePrice` in the same file) applies the
multi-day bundle discount when 2+ distinct days are selected, otherwise
the group-size discount when quantity qualifies.

## Turning this into a real, sellable platform

To go from this preview to something that can actually sell tickets:

1. **Get real, authorized inventory** — your own event, or a verified
   promoter/reseller agreement with real ticket counts.
2. **Add a real backend** — Supabase (Postgres + Auth + RLS) is a good
   fit: `profiles`, `events`, `ticket_types`, `orders`, `tickets` tables,
   with Row Level Security so customers can only see their own data.
3. **Add a real payment processor** — Stripe (or similar), called from a
   server-side function (e.g. a Supabase Edge Function), never from the
   browser directly. Confirm payment via webhook before issuing tickets.
4. **Replace the demo QR** with a real signed ticket token, verified at
   the door by a scanning app.
5. **Legal basics** — clear terms of sale, refund policy, and no implying
   you're an "official" seller unless you actually are one.

## Credits / disclaimer

Event name, artist names, dates, and venue are used for demonstration
purposes only, based on publicly reported tour information. This site
does not sell real tickets and should not be deployed as a live storefront.
