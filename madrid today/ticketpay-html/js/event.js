/* =========================================================
   TICKETMASTER — event page booking logic
   ========================================================= */

// Date selection
const dateCards = document.querySelectorAll(".date-card:not(:disabled)");
dateCards.forEach(card => {
  card.addEventListener("click", () => {
    dateCards.forEach(item => item.classList.remove("selected"));
    card.classList.add("selected");
  });
});

// Quantity system
let totalTickets = 0;
let ticketTotal = 0;

document.querySelectorAll(".ticket-card").forEach(card => {
  const minus = card.querySelector(".quantity-minus");
  const plus = card.querySelector(".quantity-plus");
  const quantity = card.querySelector(".quantity");
  const price = parseFloat(card.querySelector(".ticket-price strong").textContent.replace("€", "").replace(",", "."));
  
  let count = 0;
  
  plus.addEventListener("click", () => {
    if (count >= 10) return;
    count++;
    quantity.textContent = count;
    minus.disabled = count === 0;
    updateSummary();
  });
  
  minus.addEventListener("click", () => {
    if (count <= 0) return;
    count--;
    quantity.textContent = count;
    minus.disabled = count === 0;
    updateSummary();
  });
});

function updateSummary() {
  totalTickets = 0;
  ticketTotal = 0;
  
  document.querySelectorAll(".ticket-card").forEach(card => {
    const qty = Number(card.querySelector(".quantity").textContent);
    const price = parseFloat(card.querySelector(".ticket-price strong").textContent.replace("€", "").replace(",", "."));
    totalTickets += qty;
    ticketTotal += qty * price;
  });
  
  const serviceFee = ticketTotal > 0 ? ticketTotal * 0.08 : 0;
  const grandTotal = ticketTotal + serviceFee;
  
  document.getElementById("summaryCount").textContent = `${totalTickets} ticket${totalTickets === 1 ? "" : "s"}`;
  document.getElementById("ticketTotal").textContent = `€${ticketTotal.toFixed(2)}`;
  document.getElementById("serviceFee").textContent = `€${serviceFee.toFixed(2)}`;
  document.getElementById("grandTotal").textContent = `€${grandTotal.toFixed(2)}`;
  
  const empty = document.getElementById("summaryEmpty");
  const content = document.getElementById("summaryContent");
  const continueBtn = document.getElementById("continueButton");
  
  if (totalTickets > 0) {
    empty.style.display = "none";
    content.style.display = "block";
    continueBtn.disabled = false;
  } else {
    empty.style.display = "block";
    content.style.display = "none";
    continueBtn.disabled = true;
  }
}

// Continue button
document.getElementById("continueButton").addEventListener("click", () => {
  // Save selection to cart (simplified - just store basic)
  const selection = [];
  document.querySelectorAll(".ticket-card").forEach(card => {
    const qty = Number(card.querySelector(".quantity").textContent);
    if (qty > 0) {
      const tierId = card.querySelector("h4").textContent.toLowerCase().replace(/\s+/g, "-");
      selection.push({ day: "sat", tier: tierId, qty: qty });
    }
  });
  // Store in cart and go to checkout
  Cart.clear();
  selection.forEach(item => Cart.setQty(item.day, item.tier, item.qty));
  window.location.href = "checkout.html";
});

// Map controls (basic)
let mapScale = 1;
function zoomMap(amount) {
  mapScale += amount;
  mapScale = Math.max(0.6, Math.min(2, mapScale));
  document.getElementById("stadiumMap").style.transform = `scale(${mapScale})`;
}
function resetMap() {
  mapScale = 1;
  document.getElementById("stadiumMap").style.transform = "scale(1)";
}
function openMap() {
  document.querySelector(".map-card").scrollIntoView({ behavior: "smooth", block: "center" });
}