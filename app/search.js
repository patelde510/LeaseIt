async function fetchAllLeases() {
    const response = await fetch("/all-leases");
    const leases = await response.json();
    const resultsContainer = document.getElementById("search-results");
    resultsContainer.innerHTML = "";

    if (leases.length === 0) {
        resultsContainer.innerHTML = "<p class='text-center'>No listings found.</p>";
        return;
    }

    leases.forEach((lease, index) => {
        const leaseCard = document.createElement("div");
        leaseCard.classList.add("col-lg-3", "col-md-4", "col-sm-6", "mb-3");

        let carouselId = `carousel-${index}`;
        let carouselInner = "";
        let hideArrows = "";

        if (lease.images && lease.images.length > 0) {
            lease.images.forEach((image, i) => {
                carouselInner += `
            <div class="carousel-item ${i === 0 ? 'active' : ''}">
                <img src="${image}" class="d-block w-100 lease-image" alt="Lease Image">
            </div>
        `;
            });
        } else {
            carouselInner = `
        <div class="carousel-item active">
            <div class="no-image">No Image Available</div>
        </div>
    `;
            hideArrows = "hide-arrows";
        }

        let displayedAmenities = lease.amenities ? lease.amenities.slice(0, 2).join(", ") : "None listed";
        if (lease.amenities.length > 2) displayedAmenities += " ...";

        leaseCard.innerHTML = `
    <div class="card lease-card">
        <div id="${carouselId}" class="carousel slide lease-image-container ${hideArrows}" data-bs-ride="carousel">
            <div class="carousel-inner">
                ${carouselInner}
            </div>
            <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
            </button>
        </div>
        <div class="card-body d-flex flex-column">
            <h6 class="card-title text-truncate" title="${lease.title}">${lease.title}</h6>
            <p class="text-muted extra-small text-truncate" title="${lease.street}, ${lease.city}, ${lease.state} ${lease.zip_code}">
                ${lease.street}, ${lease.city}, ${lease.state} ${lease.zip_code}
            </p>
            <p class="extra-small"><strong>Lease Duration:</strong> ${lease.lease_duration}</p>
            <p class="extra-small text-truncate" title="${lease.amenities.join(', ')}">
                <strong>Amenities:</strong> ${displayedAmenities}
            </p>
            <div class="mt-auto">
                <p class="rent-price text-success"><strong>$${lease.price}/month</strong></p>
                <a href="#" class="btn btn-apply view-btn btn-primary btn-sm w-100">View Listing</a>
            </div>
        </div>
    </div>
`;

        resultsContainer.appendChild(leaseCard);
    });
}
fetchAllLeases();

async function loadNavbar() {
    const response = await fetch("navbar.html");
    const navbarHTML = await response.text();
    document.getElementById("navbar-placeholder").innerHTML = navbarHTML;
}
loadNavbar();

// **Search Button Click Event**
document.getElementById("search-btn").addEventListener("click", async function () {
    const filters = {
        address: document.getElementById("search-address").value,
        maxPrice: document.getElementById("search-max-price").value,
        monthStart: document.getElementById("search-month-start").value,
        monthEnd: document.getElementById("search-month-end").value,
        bedrooms: document.getElementById("search-bedrooms").value,
        bathrooms: document.getElementById("search-bathrooms").value,
        propertyType: document.getElementById("search-property-type").value,
        sharedSpace: document.getElementById("search-shared-space").value,
        bathroomType: document.getElementById("search-bathroom-type").value,
        furnished: document.getElementById("search-furnished").value,
        amenities: [...document.querySelectorAll(".amenity:checked")].map(e => e.value)
    };

    const response = await fetch("/search-leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
    });

    const results = await response.json();
    const resultsContainer = document.getElementById("search-results");
    resultsContainer.innerHTML = "";

    if (results.length === 0) {
        resultsContainer.innerHTML = "<p class='text-center'>No listings found.</p>";
        return;
    }

    results.forEach((lease, index) => {
        const leaseCard = document.createElement("div");
        leaseCard.classList.add("col-lg-3", "col-md-4", "col-sm-6", "mb-3");

        let carouselId = `carousel-${index}`;
        let carouselInner = "";
        let hideArrows = "";

        if (lease.images && lease.images.length > 0) {
            lease.images.forEach((image, i) => {
                carouselInner += `
            <div class="carousel-item ${i === 0 ? 'active' : ''}">
                <img src="${image}" class="d-block w-100 lease-image" alt="Lease Image">
            </div>
        `;
            });
        } else {
            carouselInner = `
        <div class="carousel-item active">
            <div class="no-image">No Image Available</div>
        </div>
    `;
            hideArrows = "hide-arrows";
        }

        let displayedAmenities = lease.amenities ? lease.amenities.slice(0, 2).join(", ") : "None listed";
        if (lease.amenities.length > 2) displayedAmenities += " ...";

        leaseCard.innerHTML = `
    <div class="card lease-card">
        <div id="${carouselId}" class="carousel slide lease-image-container ${hideArrows}" data-bs-ride="carousel">
            <div class="carousel-inner">
                ${carouselInner}
            </div>
            <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
            </button>
        </div>
        <div class="card-body d-flex flex-column">
            <h6 class="card-title text-truncate" title="${lease.title}">${lease.title}</h6>
            <p class="text-muted extra-small text-truncate" title="${lease.street}, ${lease.city}, ${lease.state} ${lease.zip_code}">
                ${lease.street}, ${lease.city}, ${lease.state} ${lease.zip_code}
            </p>
            <p class="extra-small"><strong>Lease Duration:</strong> ${lease.lease_duration}</p>
            <p class="extra-small text-truncate" title="${lease.amenities.join(', ')}">
                <strong>Amenities:</strong> ${displayedAmenities}
            </p>
            <div class="mt-auto">
                <p class="rent-price text-success"><strong>$${lease.price}/month</strong></p>
                <a href="#" class="btn view-btn btn-primary btn-sm w-100">View Listing</a>
            </div>
        </div>
    </div>
`;

        resultsContainer.appendChild(leaseCard);
    });
});

document.getElementById("filter-btn").addEventListener("click", function () {
    new bootstrap.Modal(document.getElementById("filterModal")).show();
});

document.getElementById("apply-filters").addEventListener("click", function () {
    const modal = bootstrap.Modal.getInstance(document.getElementById("filterModal"));
    modal.hide();
    document.getElementById("search-btn").click();
});

document.getElementById("close-filter-modal").addEventListener("click", function () {
    const modal = bootstrap.Modal.getInstance(document.getElementById("filterModal"));
    modal.hide();
});

document.getElementById("clear-filters").addEventListener("click", function () {
    document.querySelectorAll(".form-control, .form-select").forEach(input => input.value = "");
    document.querySelectorAll(".amenity").forEach(checkbox => checkbox.checked = false);
});

//  Autocomplete for search-address
const searchInput = document.getElementById("search-address");

const suggestionBox = document.createElement("div");
suggestionBox.classList.add("autocomplete-box");
searchInput.parentNode.appendChild(suggestionBox);

searchInput.addEventListener("input", async () => {
  const query = searchInput.value;
  if (query.length < 2) {
    suggestionBox.innerHTML = "";
    return;
  }

  const res = await fetch(`/suggest-addresses?q=${encodeURIComponent(query)}`);
  const suggestions = await res.json();

  suggestionBox.innerHTML = "";
  suggestions.forEach(suggestion => {
    const item = document.createElement("div");
    item.textContent = suggestion;
    item.classList.add("autocomplete-item");
    item.addEventListener("click", () => {
      searchInput.value = suggestion;
      suggestionBox.innerHTML = "";
    });
    suggestionBox.appendChild(item);
  });
});

// Hide suggestions when clicking outside
document.addEventListener("click", (e) => {
  if (!suggestionBox.contains(e.target) && e.target !== searchInput) {
    suggestionBox.innerHTML = "";
  }
});
