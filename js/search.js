// 🔍 Simple search by ZIP, address, name, or description
async function searchPantries() {
  const query = document.getElementById("searchBox").value.trim().toLowerCase();
  const list = document.getElementById("results");

  list.innerHTML = "<p>Searching...</p>";

  if (!query) {
    // Show all results if query is empty
    await loadPantries();
    return;
  }

  try {
    const res = await fetch("data/pantries.json");
    const pantries = await res.json();

    const matches = pantries.filter(p => {
      const zipField = p.zip || "";
      const addressZip = p.address.match(/\b\d{5}\b/);
      const extractedZip = addressZip ? addressZip[0] : "";
      return (
        p.name.toLowerCase().includes(query) ||
        zipField.startsWith(query) ||
        extractedZip.startsWith(query) ||
        p.address.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    });

    if (matches.length === 0) {
      list.innerHTML = `<p>No matches found for "<strong>${query}</strong>".</p>`;
      return;
    }

    renderPantries(matches);
  } catch (err) {
    console.error("Error loading pantry data:", err);
    list.innerHTML = "<p class='text-danger'>Unable to load data. Please try again later.</p>";
  }
}

// ✅ Function to render pantry cards
function renderPantries(pantries) {
  const list = document.getElementById("results");
  list.innerHTML = pantries
    .map(
      p => `
      <div class="col-md-4">
        <div class="card shadow-sm h-100">
          <div class="card-body">
            <h5 class="fw-bold">${p.name}</h5>
            <p>${p.address}</p>
            <p>${p.hours || ""}</p>
            <p>${p.phone || ""}</p>
            <small class="text-muted">${p.description || ""}</small>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}

// ✅ Load all listings on page load
async function loadPantries() {
  const list = document.getElementById("results");
  try {
    const res = await fetch("data/pantries.json");
    const pantries = await res.json();
    renderPantries(pantries);
  } catch (err) {
    console.error("Error loading JSON:", err);
    list.innerHTML = "<p class='text-danger'>Unable to load listings. Please try again later.</p>";
  }
}

// ✅ Initialize event listeners
window.addEventListener("DOMContentLoaded", () => {
  loadPantries();

  const searchBox = document.getElementById("searchBox");
  const searchBtn = document.getElementById("searchBtn");

  // Trigger search on button click
  searchBtn.addEventListener("click", searchPantries);

  // Also search when pressing Enter key
  searchBox.addEventListener("keyup", e => {
    if (e.key === "Enter") searchPantries();
  });
});
  