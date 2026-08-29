/* =========================================================
   TICKETPAY — digital ticket rendering (app-style card)
   Visual reference: standard mobile ticketing app UI (blue
   header, SEC/ROW/SEAT grid, barcode, Add to Wallet, Transfer/
   Sell). Rebuilt here under the TicketPay brand — not a copy
   of any single provider's trademarked marks or copy. All
   "Transfer" / "Sell" / "Add to Wallet" actions are inert demo
   buttons; nothing here issues a real transferable ticket.
   ========================================================= */

const SEC_CODE = { general: "FLOOR", premium: "LOWER", vip: "VIP" };
const TICKET_PHOTO = {
  fri: "images/weeknd-stage.jpg",
  sat: "images/robot-stage.jpg",
  sun: "images/confetti-crowd.jpg",
};

function barcodeSVG(seed) {
  // Deterministic-looking pseudo-barcode from the ticket code — visual only.
  let bars = "";
  let x = 0;
  for (let i = 0; i < seed.length * 4; i++) {
    const char = seed.charCodeAt(i % seed.length);
    const width = ((char * (i + 3)) % 3) + 1;
    const height = 30 + ((char * (i + 7)) % 32);
    bars += `<span style="width:${width}px;height:${height}px;"></span>`;
    x += width + 2;
  }
  return bars;
}

function renderTicketCard(order, line, index) {
  const day = DAYS.find((d) => d.id === line.day);
  const tier = TIERS.find((t) => t.id === line.tier);
  const photo = TICKET_PHOTO[line.day];

  return `
    <div class="tm-ticket-card animate-rise">
      <div class="tm-ticket-header">
        <span class="tm-ticket-brand">
          <span class="dot-mark"><span></span></span>
          TICKETPAY
        </span>
        <span style="font-size:11px;opacity:0.85;">#${line.code}</span>
      </div>
      <div class="tm-ticket-type">${tier.name.toUpperCase()} · GENERAL ADMISSION</div>
      <div class="tm-seat-grid">
        <div><div class="seat-label">SEC</div><div class="seat-value">${SEC_CODE[line.tier]}</div></div>
        <div><div class="seat-label">ROW</div><div class="seat-value">—</div></div>
        <div><div class="seat-label">SEAT</div><div class="seat-value">GA</div></div>
      </div>
      <div class="tm-ticket-photo" style="background-image:url('${photo}');"></div>
      <div class="tm-ticket-body">
        <p class="tm-ticket-event">The Weeknd — After Hours Til Dawn</p>
        <p class="tm-ticket-meta">${day.weekday}, ${day.date} · Riyadh Air Metropolitano, Madrid · Doors 18:00</p>

        <div class="tm-barcode">${barcodeSVG(line.code + index)}</div>
        <p class="tm-barcode-caption">This ticket must be shown live in the app — screenshots aren't accepted at entry.</p>

        <button class="tm-wallet-btn" onclick="showToast('Demo only — wallet passes aren\\'t issued in this preview.')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3 4 12l8 9 8-9-8-9Z" stroke="#fff" stroke-width="1.5"/></svg>
          Add to Apple Wallet
        </button>
      </div>
      <div class="tm-ticket-footer">
        <button onclick="showToast('Demo only — transfer isn\\'t wired to a real account system.')">Transfer</button>
        <button onclick="showToast('Demo only — resale isn\\'t enabled in this preview.')">Sell</button>
      </div>
      <div class="tm-ticket-verified">TicketPay · design preview, not a valid ticket for entry</div>
    </div>`;
}

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Generates one large demo order with `count` individual tickets,
 *  spread evenly across all 3 days and all 3 tiers, so the ticket
 *  list / grid can be tested at real volume. Purely a local demo
 *  tool — it does not touch REMAINING or go through checkout. */
function seedDemoTickets(count) {
  const combos = [];
  DAYS.forEach((d) => TIERS.forEach((t) => combos.push({ day: d.id, tier: t.id })));

  const lines = Array.from({ length: count }, (_, i) => {
    const combo = combos[i % combos.length];
    return { day: combo.day, tier: combo.tier, code: genCode() };
  });

  const total = lines.reduce((sum, l) => sum + BASE_PRICE[l.tier], 0);

  const order = {
    code: genCode(),
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    summary: `The Weeknd · Demo batch (${count} tickets)`,
    ticketCount: count,
    total,
    method: "demo-seed",
    lines,
  };

  Orders.add(order);
  renderTicketsPage();
  showToast(`Generated ${count} demo tickets.`);
}

function clearDemoTickets() {
  localStorage.removeItem("ticketpay.demo.orders");
  renderTicketsPage();
  showToast("Cleared all demo tickets.");
}

function openTicketDetails(orderCode, lineCode) {
  const order = Orders.all().find((o) => o.code === orderCode);
  const line = order.lines.find((l) => l.code === lineCode);
  const tier = TIERS.find((t) => t.id === line.tier);
  const day = DAYS.find((d) => d.id === line.day);

  const faceValue = BASE_PRICE[line.tier];
  const serviceFee = Math.round(faceValue * 0.12 * 100) / 100;
  const total = Math.round((faceValue + serviceFee) * 100) / 100;

  document.getElementById("modal-body").innerHTML = `
    <div class="tm-modal-row"><span>Order number</span><span>#${order.code}</span></div>
    <div class="tm-modal-row"><span>Barcode number</span><span>${line.code}${line.code}</span></div>
    <div class="tm-modal-row"><span>Ticket type</span><span>${tier.name}</span></div>
    <div class="tm-modal-row"><span>Event</span><span>${day.weekday}, ${day.date}</span></div>
    <div class="tm-modal-row"><span>Face value</span><span>${formatEUR(faceValue)}</span></div>
    <div class="tm-modal-row"><span>Service fee (demo)</span><span>${formatEUR(serviceFee)}</span></div>
    <div class="tm-modal-row is-total"><span>Total (this ticket)</span><span>${formatEUR(total)}</span></div>
    <p class="tm-modal-terms">This is a demo ticket generated for a design preview. It is not a real purchase, is not valid for entry anywhere, and TicketPay is not an authorized seller for this event. Terms shown are illustrative only.</p>
  `;
  document.getElementById("ticket-modal").classList.add("is-open");
}

function closeTicketDetails() {
  document.getElementById("ticket-modal").classList.remove("is-open");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

function renderTicketsPage() {
  const orders = Orders.all();
  const list = document.getElementById("tickets-list");

  if (orders.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>No tickets yet</h3>
        <p>Complete a demo checkout on the Madrid event page to see tickets here.</p>
        <div style="margin-top:18px;"><a href="event.html" class="btn btn-primary btn-sm">Browse Madrid tickets</a></div>
      </div>`;
    return;
  }

  list.innerHTML = orders
    .map((o) => {
      const cards = o.lines
        .map((l, i) => {
          const card = renderTicketCard(o, l, i);
          return `<div onclick="openTicketDetailsFromCard(event, '${o.code}', '${l.code}')" style="cursor:pointer;">${card}</div>`;
        })
        .join("");
      return `
        <div class="tm-order-block">
          <div class="tm-order-heading">
            <h3>Order #${o.code}</h3>
            <span>${o.date} · ${o.ticketCount} ticket${o.ticketCount > 1 ? "s" : ""} · ${formatEUR(o.total)}</span>
          </div>
          <div class="tm-ticket-grid">${cards}</div>
        </div>`;
    })
    .join("");
}

function openTicketDetailsFromCard(e, orderCode, lineCode) {
  // Don't trigger the details modal if a footer action button was clicked.
  if (e.target.closest("button")) return;
  openTicketDetails(orderCode, lineCode);
}

document.addEventListener("DOMContentLoaded", () => {
  renderTicketsPage();
  const params = new URLSearchParams(window.location.search);
  if (params.get("new")) {
    showToast("Payment simulated — your demo tickets are ready.");
  }
});
