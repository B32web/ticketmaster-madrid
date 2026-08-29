/* =========================================================
   TICKETMASTER — Interactive Seat Map (if needed)
   Colors: Blue #026CDF available, Gray #999999 unavailable,
           Green #00875A selected, Pink #FF4B3E resale
   ========================================================= */

const SEAT_COLORS = {
  available: '#026CDF',
  unavailable: '#999999',
  selected: '#00875A',
  resale: '#FF4B3E'
};

// Simplified stadium sections (original design)
const SEAT_SECTIONS = [
  { id: 'floorA', tier: 'ga', label: 'Floor A', d: 'M 120 260 L 90 300 A 200 130 0 0 0 210 300 Z' },
  { id: 'floorB', tier: 'ga', label: 'Floor B', d: 'M 210 300 L 240 260 A 200 130 0 0 1 360 260 L 330 300 Z' },
  { id: 'lowerL1', tier: 'premium', label: 'Lower West 1', d: 'M 90 300 L 60 420 A 260 210 0 0 0 90 460 Z' },
  { id: 'lowerL2', tier: 'premium', label: 'Lower West 2', d: 'M 60 420 L 90 300 L 120 320 L 80 440 Z' },
  { id: 'lowerR1', tier: 'premium', label: 'Lower East 1', d: 'M 330 300 L 360 420 A 260 210 0 0 1 330 460 Z' },
  { id: 'lowerR2', tier: 'premium', label: 'Lower East 2', d: 'M 360 420 L 330 300 L 300 320 L 340 440 Z' },
  { id: 'upperTop', tier: 'standard', label: 'Upper North', d: 'M 90 300 A 160 160 0 0 1 410 300 L 380 320 A 130 130 0 0 0 120 320 Z' },
  { id: 'vipL', tier: 'vip', label: 'VIP Stage Left', d: 'M 120 460 L 90 500 L 150 520 L 180 480 Z' },
  { id: 'vipR', tier: 'vip', label: 'VIP Stage Right', d: 'M 380 460 L 410 500 L 350 520 L 320 480 Z' },
  { id: 'vipC', tier: 'vip', label: 'VIP Center', d: 'M 180 480 L 150 520 L 250 540 L 350 520 L 320 480 Z' }
];

let selectedSectionId = null;

function seatmapSVG() {
  const paths = SEAT_SECTIONS.map((s, idx) => {
    const isSoldOut = idx % 5 === 3;
    const color = isSoldOut ? SEAT_COLORS.unavailable : SEAT_COLORS.available;
    return `<path class="seat-section" data-section="${s.id}" d="${s.d}" fill="${color}" fill-opacity="${isSoldOut ? 0.3 : 0.7}" stroke="${color}" stroke-width="1.5"></path>`;
  }).join('');
  return `<svg viewBox="0 0 500 560" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="250" cy="300" rx="215" ry="220" fill="none" stroke="#E6E6E6" stroke-width="1.5" />
    ${paths}
    <rect x="200" y="520" width="100" height="26" rx="4" fill="#1F262D" />
    <text x="250" y="537" text-anchor="middle" fill="#FFFFFF" font-size="10">STAGE</text>
  </svg>`;
}

function initSeatmap() {
  const mount = document.getElementById("seatmap-svg-mount");
  if (!mount) return;
  mount.innerHTML = seatmapSVG();
  mount.querySelectorAll(".seat-section").forEach(el => {
    el.addEventListener("click", () => {
      selectedSectionId = el.dataset.section;
      mount.querySelectorAll(".seat-section").forEach(s => s.classList.remove("is-selected"));
      el.classList.add("is-selected");
    });
  });
}

document.addEventListener("DOMContentLoaded", initSeatmap);