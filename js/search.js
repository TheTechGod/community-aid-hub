// =========================================================
// Community Aid Hub - Smart Search + Map + OpenNow Label
// Author: Geoffrey D. Metzger | Integrity Programming
// =========================================================

// 🧹 Normalize strings for more forgiving matching
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
}

// 🕓 Determine if the pantry is open today (based on weekday text)
function getOpenStatus(hours) {
  if (!hours) return "";
  const today = new Date().toLocaleString("en-US", { weekday: "short" }).toLowerCase();
  const lowerHours = hours.toLowerCase();
  if (lowerHours.includes(today)) return "🟢 Open Today";
  return "⚪ Closed Now";
}

// 🔍 Universal search across multiple fields
async function searchPantries() {
  const query = normalize(document.getElementById("searchBox").value);
  const list = document.getElementById("results");
  list.innerHTML = "<p class='text-center mt-3'>Searching...</p>";

  if (!query) {
    await loadPantries();
    return;
  }

  try {
    const basePath = `${window.location.origin}/data/resources.json`;
    const res = await fetch(basePath);
    if (!res.ok) throw new Error(`HTTP ${res.status} – could not load data`);
    const pantries = await res.json();

    const matches = pantries.filter(p => {
      const searchFields = [
        p.name,
        p.address,
        p.zip,
        p.description,
        p.community,
        p.region,
        p.type,
        Array.isArray(p.services) ? p.services.join(" ") : ""
      ]
        .map(normalize)
        .join(" ");

      return searchFields.includes(query);
    });

    if (matches.length === 0) {
      list.innerHTML = `<p class="text-center text-muted mt-3">
        No matches found for "<strong>${query}</strong>".
      </p>`;
      return;
    }

    renderPantries(matches);
  } catch (err) {
    console.error("Error loading pantry data:", err);
    list.innerHTML = `<p class='text-danger text-center mt-3'>
      ⚠️ Unable to load pantry data. Please try again later.
    </p>`;
  }
}

// ✅ Render pantry cards dynamically with map + open-status
function renderPantries(pantries) {
  const list = document.getElementById("results");
  list.innerHTML = pantries
    .map(
      p => `
      <div class="col-md-4 mb-3">
        <div class="card shadow-sm h-100 border-0">
          <div class="card-body">
            <h5 class="fw-bold">${p.name}</h5>
            <p class="mb-1"><strong>📍</strong> ${p.address}</p>
            <p class="mb-1"><strong>🕓</strong> ${p.hours || "Hours not listed"}</p>
            <p class="text-success small">${getOpenStatus(p.hours)}</p>
            <p class="mb-1"><strong>📞</strong> ${p.phone || "N/A"}</p>

            ${
              p.latitude && p.longitude
                ? `<iframe 
                    width="100%" 
                    height="180" 
                    style="border:0; border-radius:10px; margin-bottom:10px;"
                    loading="lazy"
                    allowfullscreen
                    referrerpolicy="no-referrer-when-downgrade"
                    src="https://maps.google.com/maps?q=${p.latitude},${p.longitude}&z=14&output=embed">
                  </iframe>`
                : ""
            }

            ${
              p.services
                ? `<div class="mb-2">${p.services
                    .map(s => `<span class="badge bg-primary me-1">${s}</span>`)
                    .join("")}</div>`
                : ""
            }

            ${
              p.website
                ? `<a href="${p.website}" target="_blank" class="btn btn-outline-success btn-sm mb-2">
                     Visit Website
                   </a>`
                : ""
            }

            <p class="small text-muted mb-0">
              ${p.community ? `<strong>${p.community}</strong> • ` : ""}
              ${p.region || ""}
            </p>
            <hr class="my-2">
            <p class="small text-muted mb-0">
              ✅ Verified ${p.lastUpdated || "Oct 2025"} | ${p.category || "Food Assistance"}
            </p>
          </div>
        </div>
      </div>`
    )
    .join("");
}

// ✅ Load all listings on initial page load
async function loadPantries() {
  const list = document.getElementById("results");
  try {
    const basePath = `${window.location.origin}/data/resources.json`;
    const res = await fetch(basePath);
    if (!res.ok) throw new Error(`HTTP ${res.status} – failed to fetch`);
    const pantries = await res.json();
    renderPantries(pantries);
  } catch (err) {
    console.error("Error loading JSON:", err);
    list.innerHTML = `<p class='text-danger text-center mt-3'>
      ⚠️ Unable to load listings. Please try again later.
    </p>`;
  }
}

// ✅ Initialize search + event listeners
window.addEventListener("DOMContentLoaded", () => {
  loadPantries();

  const searchBox = document.getElementById("searchBox");
  const searchBtn = document.getElementById("searchBtn");

  if (searchBtn)
    searchBtn.addEventListener("click", e => {
      e.preventDefault();
      searchPantries();
    });

  if (searchBox)
    searchBox.addEventListener("keyup", e => {
      if (e.key === "Enter") searchPantries();
    });
});

