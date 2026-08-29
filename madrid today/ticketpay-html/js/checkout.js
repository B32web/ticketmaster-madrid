/* =========================================================
   TICKETMASTER — checkout logic
   Only Crypto is active; other methods show notice.
   Reads seat selection from Cart.getSeats().
   ========================================================= */

let selectedMethod = "crypto";
let timerInterval = null;
let secondsLeft = 10 * 60;

// Crypto wallet addresses
const WALLETS = {
  btc: "bc1qwhenpffhnsgjds3tg63qcvf78ce8sdxeppm786",
  eth: "0x72A03aC25A98FD0882950e08165738dC81147ef6",
  xmr: "44qospXyVfKTv9kKVDv1YZcjuWc9fhbiiZrdRgyTWjAjFDEuthaNWMP88mB89ofEUsLivZQt1mVsoSLL7AqazA8HCigtpFB"
};

function startTimer() {
  const timerEl = document.getElementById("timer");
  timerInterval = setInterval(() => {
    secondsLeft -= 1;
    const m = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const s = String(secondsLeft % 60).padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      timerEl.textContent = "Expired";
    }
  }, 1000);
}

function initCrypto() {
  // Fill addresses
  document.getElementById("crypto-addr-btc").textContent = WALLETS.btc;
  document.getElementById("crypto-addr-eth").textContent = WALLETS.eth;
  document.getElementById("crypto-addr-xmr").textContent = WALLETS.xmr;
  
  // Generate QR codes
  new QRCode(document.getElementById("qr-btc"), { text: "bitcoin:" + WALLETS.btc, width: 180, height: 180 });
  new QRCode(document.getElementById("qr-eth"), { text: "ethereum:" + WALLETS.eth, width: 180, height: 180 });
  new QRCode(document.getElementById("qr-xmr"), { text: "monero:" + WALLETS.xmr, width: 180, height: 180 });
  
  // Crypto tabs
  document.querySelectorAll(".crypto-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".crypto-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".crypto-panel").forEach(p => p.style.display = "none");
      tab.classList.add("active");
      const panelId = "crypto-panel-" + tab.dataset.coin;
      document.getElementById(panelId).style.display = "block";
    });
  });
  
  // Copy buttons
  document.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const text = document.getElementById(btn.dataset.target).textContent;
      try { await navigator.clipboard.writeText(text); } catch(e) {}
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => btn.textContent = original, 1500);
    });
  });
}

// Load seat selection and compute total
function renderOrderSummary() {
  const seats = Cart.getSeats();
  const summaryEl = document.getElementById("ticketSummary");
  const totalEl = document.getElementById("grandTotal");
  const payButton = document.getElementById("payButton");

  if (seats.length === 0) {
    summaryEl.innerHTML = '<div class="ticket-line"><span>No seats selected</span><strong>€0.00</strong></div>';
    totalEl.textContent = "€0.00";
    payButton.disabled = true;
    return;
  }

  let subtotal = 0;
  let itemsHtml = "";
  seats.forEach(seat => {
    subtotal += seat.price;
    itemsHtml += `<div class="ticket-line"><span>${seat.sectionName || seat.section} · Row ${seat.row} · Seat ${seat.seat}</span><strong>€${seat.price.toFixed(2)}</strong></div>`;
  });
  
  // Apply group discount (based on number of seats)
  let discountRate = 0;
  let discountLabel = "";
  const qty = seats.length;
  if (qty >= 5) { discountRate = 0.10; discountLabel = "Group of 5+ · 10% off"; }
  else if (qty >= 4) { discountRate = 0.08; discountLabel = "Group of 4 · 8% off"; }
  else if (qty >= 3) { discountRate = 0.05; discountLabel = "Group of 3 · 5% off"; }
  else if (qty >= 2) { discountRate = 0.03; discountLabel = "Group of 2 · 3% off"; }

  const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
  const total = Math.round((subtotal - discountAmount) * 100) / 100;

  summaryEl.innerHTML = `
    ${itemsHtml}
    ${discountRate > 0 ? `<div class="ticket-line"><span>${discountLabel}</span><strong>-€${discountAmount.toFixed(2)}</strong></div>` : ""}
  `;
  totalEl.textContent = "€" + total.toFixed(2);
  payButton.disabled = false;
}

// Payment method handling (only crypto works)
document.querySelectorAll(".payment-option").forEach(option => {
  option.addEventListener("click", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
    const method = option.dataset.method;
    if (method === "card" || method === "apple" || method === "paypal") {
      const notice = option.querySelector(".unavailable-notice");
      if (notice) notice.style.display = "block";
      return; // do not change selection
    }
    if (method === "crypto") {
      document.querySelectorAll(".payment-option").forEach(o => o.classList.remove("selected"));
      option.classList.add("selected");
      selectedMethod = "crypto";
    }
  });
});

// Terms checkbox
const terms = document.getElementById("terms");
const payButton = document.getElementById("payButton");
terms.addEventListener("change", () => {
  payButton.disabled = !terms.checked || Cart.getSeats().length === 0;
});

// Pay button (simulate crypto payment)
payButton.addEventListener("click", () => {
  if (!terms.checked || Cart.getSeats().length === 0) return;
  payButton.textContent = "Processing...";
  payButton.disabled = true;

  setTimeout(() => {
    const seats = Cart.getSeats();
    const total = parseFloat(document.getElementById("grandTotal").textContent.replace("€", ""));
    const pkg = (typeof Cart.getPackage === "function" && Cart.getPackage()) || { day: "sat" };
    const dayId = pkg.day || "sat";

    // Reserve real inventory now — this is the only place tickets are ever deducted.
    const reservation = reserveTickets(dayId, seats.length);
    if (!reservation.ok) {
      alert(reservation.reason);
      payButton.textContent = "Confirm & Pay";
      payButton.disabled = false;
      return;
    }

    const dayLabel = (DAYS.find(d => d.id === dayId) || {}).weekday || "Saturday";
    const dayDate = (DAYS.find(d => d.id === dayId) || {}).date || "";

    let lines;
    if (reservation.isGroup) {
      // Group order (2+ seats bought together) → ONE combined ticket.
      lines = [{
        day: dayId,
        tier: pkg.tier || seats[0].section.toLowerCase(),
        code: genCode(),
        isGroup: true,
        groupSize: seats.length,
        seats: seats.map(s => ({
          sectionName: s.sectionName || s.section,
          row: s.row,
          seatNumber: s.seat
        })),
        sectionName: pkg.tierName || seats[0].sectionName || seats[0].section,
        tierLabel: pkg.tierName || seats[0].tierLabel || "",
        price: total
      }];
    } else {
      // Single-seat order → one ticket for that one seat.
      lines = seats.map(seat => ({
        day: dayId,
        tier: seat.section.toLowerCase(),
        code: genCode(),
        row: seat.row,
        seatNumber: seat.seat,
        sectionName: seat.sectionName || seat.section,
        tierLabel: seat.tierLabel || "",
        price: seat.price
      }));
    }

    const order = {
      code: Math.random().toString(36).slice(2, 8).toUpperCase(),
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      summary: `The Weeknd · ${dayLabel}, ${dayDate}`,
      ticketCount: seats.length,
      total: total,
      method: "crypto",
      lines
    };

    Orders.add(order);
    Cart.clear();
    Cart.clearSeats();
    Cart.clearPackage();
    window.location.href = "tickets.html?new=" + order.code;
  }, 900);
});

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  renderOrderSummary();
  startTimer();
  try {
    initCrypto();
  } catch (e) {
    console.error("Crypto QR setup failed (order summary still works):", e);
  }
});