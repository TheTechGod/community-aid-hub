// =========================================================
// Community Aid Hub - Resource Search & Filter
// Author: Geoffrey D. Metzger | Integrity Programming
// =========================================================

async function loadPantries(filterRegion = "All", sortBy = "name", query = "") {
  const list = document.getElementById("results");
  list.innerHTML = "<p class='text-center mt-3'>Loading resources...</p>";

  try {
    // ✅ Works locally and on Vercel
    const res = await fetch(`${window.location.origin}/data/resources.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status} – could not load JSON`);

    const data = await res.json();
    let filtered = data;

    // 🔍 Keyword Search
    if (query) {
      const lower = query.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        p.zip.toLowerCase().includes(lower) ||
        (p.community && p.community.toLowerCase().includes(lower)) ||
        (p.description && p.description.toLowerCase().includes(lower)) ||
        (p.services && p.services.join(" ").toLowerCase().includes(lower))
      );
    }

    // 🌍 Region Filter
    if (filterRegion !== "All") {
      filtered = filtered.filter(p => p.region === filterRegion);
    }

    // 🔢 Sorting
    if (sortBy === "zip") {
      filtered.sort((a, b) => a.zip.localeCompare(b.zip));
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    // 🧮 Render Results
    if (filtered.length === 0) {
      list.innerHTML = `<p class="text-center text-muted mt-4">
        No results found. Try another ZIP, region, or keyword.
      </p>`;
      return;
    }

    list.innerHTML = filtered
      .map(
        p => `
        <div class="col-md-4 mb-3">
          <div class="card shadow-sm h-100 border-0">
            <div class="card-body">
              <h5 class="fw-bold">${p.name}</h5>
              <p class="mb-1"><strong>📍</strong> ${p.address}</p>
              <p class="mb-1"><strong>🕓</strong> ${p.hours || "Hours not listed"}</p>
              <p class="mb-2"><strong>📞</strong> ${p.phone || "N/A"}</p>

              ${
                p.services
                  ? `<div class="mb-2">${p.services
                      .map(s => `<span class="badge bg-primary me-1">${s}</span>`)
                      .join("")}</div>`
                  : ""
              }

              ${
                p.website
                  ? `<a href="${p.website}" target="_blank" class="btn btn-outline-success btn-sm mb-2">Visit Website</a>`
                  : ""
              }

              <p class="small text-muted mb-0">
                ${p.community ? `<strong>${p.community}</strong> • ` : ""}${p.region || ""}
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
  } catch (err) {
    console.error("Error loading data:", err);
    list.innerHTML = `<p class='text-danger text-center mt-4'>
      ⚠️ Could not load resource data. Please try again later.
    </p>`;
  }
}

// 🧠 Auto-load on page ready
window.addEventListener("DOMContentLoaded", () => {
  const searchBox = document.getElementById("searchBox");
  const regionSelect = document.getElementById("regionFilter");
  const sortSelect = document.getElementById("sortBy");

  loadPantries();

  if (searchBox)
    searchBox.addEventListener("keyup", () =>
      loadPantries(regionSelect?.value || "All", sortSelect?.value || "name", searchBox.value)
    );

  if (regionSelect)
    regionSelect.addEventListener("change", () =>
      loadPantries(regionSelect.value, sortSelect?.value || "name", searchBox?.value || "")
    );

  if (sortSelect)
    sortSelect.addEventListener("change", () =>
      loadPantries(regionSelect?.value || "All", sortSelect.value, searchBox?.value || "")
    );
});
