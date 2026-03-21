// =========================================================
// Community Aid Hub — Search + Filter + Pagination + GPS
// Author: Geoffrey D. Metzger | Integrity Programming
// =========================================================

let allPantries = [];
let filteredPantries = [];
let currentPage = 1;
let activeCategory = "";
const PAGE_SIZE = 6;
const NEARBY_MILES = 10;

// Category color map for badges
const CATEGORY_COLORS = {
  "Food Pantry":        "bg-success",
  "Job Program":        "bg-primary",
  "Energy Assistance":  "bg-warning text-dark",
  "Housing Assistance": "bg-danger",
  "Healthcare":         "bg-info text-dark",
  "Mental Health":      "bg-purple",
  "Clothing & Goods":   "bg-secondary",
};

const CATEGORY_ICONS = {
  "Food Pantry":        "🥫",
  "Job Program":        "💼",
  "Energy Assistance":  "⚡",
  "Housing Assistance": "🏘️",
  "Healthcare":         "🏥",
  "Mental Health":      "🧠",
  "Clothing & Goods":   "👕",
};

// Normalize a string for fuzzy matching
function normalize(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

// Days a pantry is open, extracted from its hours string
const DAY_ALIASES = {
  sun: ["sun", "sunday"],
  mon: ["mon", "monday"],
  tue: ["tue", "tues", "tuesday"],
  wed: ["wed", "wednesday"],
  thu: ["thu", "thur", "thurs", "thursday"],
  fri: ["fri", "friday"],
  sat: ["sat", "saturday"]
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// Expand a range like "mon-fri" into ["mon","tue","wed","thu","fri"]
function expandDayRange(d1, d2) {
  const i1 = DAY_ORDER.indexOf(d1);
  const i2 = DAY_ORDER.indexOf(d2);
  if (i1 === -1 || i2 === -1) return [d1];
  const result = [];
  for (let i = i1; i <= i2; i++) result.push(DAY_ORDER[i]);
  return result;
}

// Return a Set of canonical day keys (mon/tue/etc.) for a pantry's hours string
function parseDays(hours) {
  if (!hours) return new Set();
  const h = hours.toLowerCase();
  const found = new Set();

  // Look for ranges: "mon-fri", "mon–sat", "mon–thu" (en-dash or hyphen)
  const rangeRe = /([a-z]+)[\-\u2013]([a-z]+)/g;
  let m;
  while ((m = rangeRe.exec(h)) !== null) {
    const from = resolveDay(m[1]);
    const to = resolveDay(m[2]);
    if (from && to) expandDayRange(from, to).forEach(d => found.add(d));
  }

  // Look for individual day mentions
  for (const [key, aliases] of Object.entries(DAY_ALIASES)) {
    if (aliases.some(a => {
      const re = new RegExp("\\b" + a + "\\b");
      return re.test(h);
    })) found.add(key);
  }

  return found;
}

function resolveDay(str) {
  str = str.toLowerCase().trim();
  for (const [key, aliases] of Object.entries(DAY_ALIASES)) {
    if (aliases.some(a => str.startsWith(a) || a.startsWith(str))) return key;
  }
  return null;
}

// Get checked days from the filter checkboxes
function getCheckedDays() {
  return Array.from(document.querySelectorAll(".day-filter:checked")).map(cb => cb.value);
}


// Simple day-of-week open indicator
function getOpenStatus(hours) {
  if (!hours) return "";
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const today = days[new Date().getDay()];
  if (normalize(hours).includes(today)) return "🟢 Open Today";
  return "⚪ Check Hours";
}

// Token-based search: all tokens must appear somewhere in the record
function matchesQuery(p, tokens) {
  if (tokens.length === 0) return true;
  const haystack = [
    p.name, p.address, p.zip, p.city, p.region, p.notes, p.community,
    Array.isArray(p.services) ? p.services.join(" ") : ""
  ].map(normalize).join(" ");
  return tokens.every(t => haystack.includes(t));
}

// Haversine distance in miles between two lat/lng points
function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Build a single pantry card
function buildCard(p) {
  const mapUrl = (p.lat && p.lng)
    ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.address || "") + ", " + (p.city || "Chicago") + ", IL")}`;

  const catColor = CATEGORY_COLORS[p.category] || "bg-secondary";
  const catIcon = CATEGORY_ICONS[p.category] || "📋";
  const catBadge = `<span class="badge ${catColor} me-1 mb-1">${catIcon} ${p.category || "Resource"}</span>`;
  const servicesBadges = Array.isArray(p.services)
    ? p.services.map(s => `<span class="badge bg-light text-dark border me-1">${s}</span>`).join("")
    : "";

  const websiteBtn = p.website
    ? `<a href="${p.website}" target="_blank" class="btn btn-outline-success btn-sm mb-2 me-1">Visit Website</a>`
    : "";

  const distBadge = p._distMiles != null
    ? `<span class="badge bg-success mb-2">${p._distMiles.toFixed(1)} mi away</span>`
    : "";

  return `
    <div class="col-md-4 mb-3">
      <div class="card shadow-sm h-100 border-0">
        <div class="card-body d-flex flex-column">
          <h5 class="fw-bold">${p.name}</h5>
          ${distBadge}
          <p class="mb-1">📍 ${p.address}${p.city && p.city !== "Chicago" ? ", " + p.city : ""}</p>
          <p class="mb-1">🕓 ${p.hours || "Hours not listed"}</p>
          <p class="text-success small mb-1">${getOpenStatus(p.hours)}</p>
          <p class="mb-2">📞 ${p.phone || "—"}</p>
          <div class="mb-2">${catBadge}${servicesBadges}</div>
          ${p.notes ? `<p class="small text-muted mb-2">${p.notes}</p>` : ""}
          <div class="mt-auto">
            ${websiteBtn}
            <a href="${mapUrl}" target="_blank" class="btn btn-outline-secondary btn-sm mb-2">📍 View on Map</a>
          </div>
          <hr class="my-2">
          <p class="small text-muted mb-0">${p.region || ""}</p>
        </div>
      </div>
    </div>`;
}

// Render the current page of results
function renderPage() {
  const list = document.getElementById("results");
  const countEl = document.getElementById("resultCount");
  const paginationEl = document.getElementById("pagination");

  if (filteredPantries.length === 0) {
    list.innerHTML = "<p class='text-center text-muted mt-3 col-12'>No pantries match your search.</p>";
    if (countEl) countEl.textContent = "";
    if (paginationEl) paginationEl.innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(filteredPantries.length / PAGE_SIZE);
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredPantries.slice(start, start + PAGE_SIZE);

  if (countEl) {
    countEl.textContent = `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filteredPantries.length)} of ${filteredPantries.length} pantries`;
  }

  list.innerHTML = pageItems.map(buildCard).join("");

  // Pagination controls
  if (paginationEl) {
    if (totalPages <= 1) {
      paginationEl.innerHTML = "";
    } else {
      paginationEl.innerHTML = `
        <nav aria-label="Pantry results pages">
          <ul class="pagination justify-content-center">
            <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
              <button class="page-link" id="prevBtn">← Previous</button>
            </li>
            <li class="page-item disabled">
              <span class="page-link">Page ${currentPage} of ${totalPages}</span>
            </li>
            <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
              <button class="page-link" id="nextBtn">Next →</button>
            </li>
          </ul>
        </nav>`;

      document.getElementById("prevBtn")?.addEventListener("click", () => {
        if (currentPage > 1) { currentPage--; renderPage(); scrollToResults(); }
      });
      document.getElementById("nextBtn")?.addEventListener("click", () => {
        if (currentPage < totalPages) { currentPage++; renderPage(); scrollToResults(); }
      });
    }
  }
}

function scrollToResults() {
  document.getElementById("resultCount")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Apply search + region + day + category filter, reset to page 1
function applyFilters() {
  const rawQuery = document.getElementById("searchBox").value;
  const tokens = normalize(rawQuery).split(/\s+/).filter(Boolean);
  const regionEl = document.getElementById("regionFilter");
  const region = regionEl ? regionEl.value : "";
  const checkedDays = getCheckedDays();

  // Clear any distance data when doing a manual search
  filteredPantries = allPantries
    .map(p => ({ ...p, _distMiles: undefined }))
    .filter(p => {
      const queryMatch = matchesQuery(p, tokens);
      const regionMatch = !region || (p.region || "") === region;
      const dayMatch = checkedDays.length === 0 ||
        checkedDays.some(d => parseDays(p.hours).has(d));
      const categoryMatch = !activeCategory || (p.category || "") === activeCategory;
      return queryMatch && regionMatch && dayMatch && categoryMatch;
    });

  currentPage = 1;
  renderPage();
}

// GPS: find pantries within NEARBY_MILES, sorted by distance
function findNearby() {
  const btn = document.getElementById("nearbyBtn");
  if (!navigator.geolocation) {
    alert("Your browser doesn't support location services.");
    return;
  }

  if (btn) { btn.textContent = "📡 Locating…"; btn.disabled = true; }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;

      // Clear filters
      if (document.getElementById("searchBox")) document.getElementById("searchBox").value = "";
      if (document.getElementById("regionFilter")) document.getElementById("regionFilter").value = "";

      const nearby = allPantries
        .filter(p => p.lat && p.lng)
        .map(p => ({ ...p, _distMiles: distanceMiles(userLat, userLng, p.lat, p.lng) }))
        .filter(p => p._distMiles <= NEARBY_MILES)
        .sort((a, b) => a._distMiles - b._distMiles);

      filteredPantries = nearby;
      currentPage = 1;

      const countEl = document.getElementById("resultCount");
      if (countEl) countEl.textContent = nearby.length > 0
        ? `Found ${nearby.length} pantries within ${NEARBY_MILES} miles of your location`
        : `No pantries found within ${NEARBY_MILES} miles of your location`;

      renderPage();

      if (btn) { btn.textContent = "📍 Near Me"; btn.disabled = false; }
    },
    err => {
      console.error("Geolocation error:", err);
      alert("Unable to get your location. Please check your browser permissions.");
      if (btn) { btn.textContent = "📍 Near Me"; btn.disabled = false; }
    },
    { timeout: 10000 }
  );
}

// Load JSON and initialize
async function loadPantries() {
  const list = document.getElementById("results");
  try {
    const res = await fetch(`${window.location.origin}/data/resources.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allPantries = await res.json();
    filteredPantries = [...allPantries];
    renderPage();
  } catch (err) {
    console.error("Error loading pantry data:", err);
    list.innerHTML = "<p class='text-danger text-center mt-3'>Unable to load pantry data. Please try again later.</p>";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadPantries();

  const searchBox = document.getElementById("searchBox");
  const searchBtn = document.getElementById("searchBtn");
  const regionFilter = document.getElementById("regionFilter");
  const nearbyBtn = document.getElementById("nearbyBtn");

  if (searchBox) {
    searchBox.addEventListener("input", applyFilters);
    searchBox.addEventListener("keyup", e => { if (e.key === "Enter") applyFilters(); });
  }
  if (searchBtn) searchBtn.addEventListener("click", e => { e.preventDefault(); applyFilters(); });
  if (regionFilter) regionFilter.addEventListener("change", applyFilters);
  if (nearbyBtn) nearbyBtn.addEventListener("click", findNearby);

  // Day filter checkboxes
  document.querySelectorAll(".day-filter").forEach(cb => {
    cb.addEventListener("change", applyFilters);
  });

  // Category tabs
  document.querySelectorAll(".category-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".category-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.dataset.category || "";
      currentPage = 1;
      applyFilters();
    });
  });
});
