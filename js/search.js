// 🔍 Simple ZIP or neighborhood filter for static JSON data
async function searchPantries() {
  const query = document.getElementById("zipInput").value.trim().toLowerCase();
  const list = document.getElementById("results");
  list.innerHTML = "<p>Searching...</p>";

  if (!query) {
    list.innerHTML = "<p class='text-muted'>Please enter a ZIP code or neighborhood name.</p>";
    return;
  }

  try {
    const res = await fetch("data/pantries.json");
    const pantries = await res.json();

    // Match either ZIP or text in address/description
    const matches = pantries.filter(
      p =>
        p.zip.startsWith(query) ||
        p.address.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      list.innerHTML = `<p>No matches found for "<strong>${query}</strong>".</p>`;
      return;
    }

    list.innerHTML = matches
      .map(
        p => `
        <div class="col-md-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="fw-bold">${p.name}</h5>
              <p>${p.address}</p>
              <p>${p.hours}</p>
              <p>${p.phone || ""}</p>
              <small class="text-muted">${p.description}</small>
            </div>
          </div>
        </div>
      `
      )
      .join("");
  } catch (err) {
    console.error("Error loading pantry data:", err);
    list.innerHTML = "<p class='text-danger'>Unable to load data. Please try again later.</p>";
  }
}