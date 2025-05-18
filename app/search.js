async function checkLoginStatus() {
    try {
        const response = await fetch('/checkSession');
        return response.ok;
    } catch (error) {
        console.error("Error checking session:", error);
        return false;
    }
}

async function fetchAllLeases() {
    const response = await fetch("/all-leases");
    const leases = await response.json();
    const resultsContainer = document.getElementById("search-results");
    resultsContainer.innerHTML = "";
    const isLoggedIn = await checkLoginStatus();
    renderLeases(leases, resultsContainer, isLoggedIn);

    document.querySelectorAll(".view-btn").forEach((btn, i) => {
        btn.addEventListener("click", () => {
            const lease = leases[i]; // get correct lease object

            // Fill modal fields
            document.getElementById("modal-title").textContent = lease.title;
            document.getElementById("modal-address").textContent = `${lease.street}, ${lease.city}, ${lease.state} ${lease.zip_code}`;
            document.getElementById("modal-duration").textContent = lease.lease_duration;
            document.getElementById("modal-price").textContent = lease.price;
            document.getElementById("modal-bedrooms").textContent = lease.bedrooms;
            document.getElementById("modal-bathrooms").textContent = lease.bathrooms;
            document.getElementById("modal-property-type").textContent = lease.property_type;
            document.getElementById("modal-shared-space").textContent = lease.shared_space ? "Yes" : "No";
            document.getElementById("modal-furnished").textContent = lease.furnished ? "Yes" : "No";
            document.getElementById("modal-bathroom-type").textContent = lease.bathroom_type;
            document.getElementById("modal-amenities").textContent = lease.amenities.join(", ");
            document.getElementById("modal-email-link").textContent = lease.email;
            document.getElementById("modal-email-button").href = `mailto:${lease.email}`;


            // Set image preview and thumbnails
            const mainImg = document.getElementById("main-preview-image");
            const thumbContainer = document.getElementById("thumbnail-gallery");
            const mainCol = document.getElementById("main-preview-column");

            thumbContainer.innerHTML = "";
            mainCol.className = "col-lg-9 col-md-8 col-12"; // reset default width

            const validImages = (lease.images || []).filter(img => img && img.trim() !== "");

            if (validImages.length > 0) {
                mainImg.src = validImages[0];
                mainImg.alt = "Preview Image";

                thumbContainer.style.display = "flex";
                mainCol.className = "col-lg-9 col-md-8 col-12";

                validImages.forEach((imgUrl, idx) => {
                    const thumb = document.createElement("img");
                    thumb.src = imgUrl;
                    if (idx === 0) thumb.classList.add("active-thumb");

                    thumb.addEventListener("click", () => {
                        mainImg.src = imgUrl;
                        document.querySelectorAll("#thumbnail-gallery img").forEach(img => img.classList.remove("active-thumb"));
                        thumb.classList.add("active-thumb");
                    });

                    thumbContainer.appendChild(thumb);
                });
            } else {
                mainImg.src = "images/no-image.png";
                mainImg.alt = "No Image Available";

                // Hide the thumbnails and expand main image column
                thumbContainer.style.display = "none";
                mainCol.className = "col-12";
            }

            const modalElement = document.getElementById("listingModal");
            const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
            modal.show()
        });
    });


}

async function renderLeases(leases, container, isLoggedIn) {
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

        let favoritesButtonHTML = '';
        if (isLoggedIn) {
            favoritesButtonHTML = `
                <button class="btn btn-sm btn-outline-primary add-to-favorites-btn mb-2" data-lease-id="${lease.lease_id}">
                    <i class="fa-regular fa-star"></i>
                </button>
            `;
        }

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
                <div class="mt-auto d-flex flex-column align-items-start">
                    <p class="rent-price text-success"><strong>$${lease.price}/month</strong></p>
                    ${favoritesButtonHTML}
                    <a class="btn btn-apply view-btn btn-primary btn-sm w-100">View Listing</a>
                </div>
            </div>
        </div>
    `;

        container.appendChild(leaseCard);
    });

    document.querySelectorAll(".view-btn").forEach((btn, i) => {
        btn.addEventListener("click", () => {
            const lease = leases[i]; // get correct lease object

            // Fill modal fields
            document.getElementById("modal-title").textContent = lease.title;
            document.getElementById("modal-address").textContent = `${lease.street}, ${lease.city}, ${lease.state} ${lease.zip_code}`;
            document.getElementById("modal-duration").textContent = lease.lease_duration;
            document.getElementById("modal-price").textContent = lease.price;
            document.getElementById("modal-bedrooms").textContent = lease.bedrooms;
            document.getElementById("modal-bathrooms").textContent = lease.bathrooms;
            document.getElementById("modal-property-type").textContent = lease.property_type;
            document.getElementById("modal-shared-space").textContent = lease.shared_space ? "Yes" : "No";
            document.getElementById("modal-furnished").textContent = lease.furnished ? "Yes" : "No";
            document.getElementById("modal-bathroom-type").textContent = lease.bathroom_type;
            document.getElementById("modal-amenities").textContent = lease.amenities.join(", ");
            document.getElementById("modal-email-link").textContent = lease.email;
            document.getElementById("modal-email-button").href = `mailto:${lease.email}`;

            const descElem = document.getElementById("modal-description-text");
            if (lease.description && lease.description.trim() !== "") {
                descElem.textContent = lease.description;
            } else {
                descElem.innerHTML = `<span class="fst-italic text-muted">No description provided.</span>`;
            }

            // Set image preview and thumbnails
            const mainImg = document.getElementById("main-preview-image");
            const thumbContainer = document.getElementById("thumbnail-gallery");
            const mainCol = document.getElementById("main-preview-column");

            thumbContainer.innerHTML = "";
            mainCol.className = "col-lg-9 col-md-8 col-12"; // reset default width

            const validImages = (lease.images || []).filter(img => img && img.trim() !== "");

            if (validImages.length > 0) {
                mainImg.src = validImages[0];
                mainImg.alt = "Preview Image";

                thumbContainer.style.display = "flex";
                mainCol.className = "col-lg-9 col-md-8 col-12";

                validImages.forEach((imgUrl, idx) => {
                    const thumb = document.createElement("img");
                    thumb.src = imgUrl;
                    if (idx === 0) thumb.classList.add("active-thumb");

                    thumb.addEventListener("click", () => {
                        mainImg.src = imgUrl;
                        document.querySelectorAll("#thumbnail-gallery img").forEach(img => img.classList.remove("active-thumb"));
                        thumb.classList.add("active-thumb");
                    });

                    thumbContainer.appendChild(thumb);
                });
            } else {
                mainImg.src = "images/no-image.png";
                mainImg.alt = "No Image Available";

                // Hide the thumbnails and expand main image column
                thumbContainer.style.display = "none";
                mainCol.className = "col-12";
            }

            const modal = new bootstrap.Modal(document.getElementById("listingModal"));
            modal.show();
        });
    });


    if (container.id === "search-results") {
        initializeMap(leases);
    }
}

fetchAllLeases();

async function loadNavbar() {
    const response = await fetch("navbar.html");
    const navbarHTML = await response.text();
    document.getElementById("navbar-placeholder").innerHTML = navbarHTML;
    await updateNavbarVisibility();
}
loadNavbar();

async function updateNavbarVisibility() {
    const isLoggedIn = await checkLoginStatus();
    const favoritesTab = document.getElementById('favorites-tab');

    if (favoritesTab) {
        if (isLoggedIn) {
            favoritesTab.style.display = 'block';
        } else {
            favoritesTab.style.display = 'none';
        }
    }
}

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
    const isLoggedIn = await checkLoginStatus();
    renderLeases(results, resultsContainer, isLoggedIn);
});

document.addEventListener('click', async function (event) {
    if (event.target.classList.contains('add-to-favorites-btn')) {
        const button = event.target;
        const leaseId = button.dataset.leaseId;
        const isLoggedIn = await checkLoginStatus();
        if (!isLoggedIn) {
            alert('You must be logged in to add to favorites.');
            return;
        }
        if (leaseId) {
            try {
                const response = await fetch('/api/favorites/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ lease_id: leaseId })
                });

                if (response.ok) {
                    alert('Added to favorites!');
                    button.innerHTML = '<i class="fa-solid fa-star"></i>';
                    button.classList.remove('btn-outline-primary');
                    button.classList.add('btn-primary', 'disabled');
                } else {
                    const errorData = await response.json();
                    alert(errorData.message || 'Failed to add to favorites.');
                }
            } catch (error) {
                console.error('Error adding to favorites:', error);
                alert('An error occurred while adding to favorites.');
            }
        }
    }
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

// Toggle functionality for switching between List View and Map View
const toggleViewBtn = document.getElementById("toggle-view-btn");
const listView = document.getElementById("list-view");
const mapView = document.getElementById("map-view");
let map;

toggleViewBtn.addEventListener("click", () => {
    // This will make the map view show up on search page if it isn't already shown.
    if (mapView.classList.contains("d-none")) {
        mapView.classList.remove("d-none");
        listView.classList.add("d-none");
        toggleViewBtn.textContent = "Switch to List View";
        document.getElementById("search-btn").click();
    } else {
        // Brings back list view if already on map view. Also updates button text back
        mapView.classList.add("d-none");
        listView.classList.remove("d-none");
        toggleViewBtn.textContent = "Switch to Map View";
        document.getElementById("search-btn").click();
    }
});

function initializeMap(filteredLeases) {
    if (!map) {
        map = new google.maps.Map(document.getElementById("map-view"), {
            zoom: 12,
        });
    }

    const bounds = new google.maps.LatLngBounds(); // Create bounds object

    // Clear existing markers from the map
    const markers = [];
    map.markers?.forEach(marker => marker.setMap(null));
    map.markers = markers;

    const geocoder = new google.maps.Geocoder();
    filteredLeases.forEach(lease => {
        if (lease.latitude && lease.longitude) {
            // If latitude and longitude are already available, use them
            addMarker(lease.latitude, lease.longitude, lease, bounds);
        } else if (lease.street && lease.city && lease.state && lease.zip_code) {
            // If address is available, geocode it
            const address = `${lease.street}, ${lease.city}, ${lease.state} ${lease.zip_code}`;
            geocoder.geocode({ address: address }, (results, status) => {
                if (status === "OK" && results[0]) {
                    const location = results[0].geometry.location;
                    addMarker(location.lat(), location.lng(), lease, bounds);
                } else {
                    console.error(`Geocoding failed for address: ${address}, status: ${status}`);
                }
            });
        }
    });

    // Adjust the map to fit all markers
    if (filteredLeases.length > 0) {
        if (filteredLeases.length === 1) {
            // Set a default zoom level when only one result is shown
            map.setCenter(bounds.getCenter());
            map.setZoom(1); // Adjust this zoom level as needed
        } else {
            map.fitBounds(bounds);
        }
    }
}

function addMarker(lat, lng, lease, bounds) {
    const marker = new google.maps.Marker({
        position: { lat: lat, lng: lng },
        map: map,
        title: lease.title,
    });

    let currentImageIndex = 0;

    // Function to generate the content for the InfoWindow
    const generateInfoWindowContent = () => {
        const imageUrl = lease.images && lease.images.length > 0
            ? lease.images[currentImageIndex]
            : null;

        const imageContent = imageUrl
            ? `<img src="${imageUrl}" alt="Image ${currentImageIndex + 1}" style="width: 100%; height: auto; max-height: 150px; object-fit: cover; margin-bottom: 10px;">`
            : "<p>No images available</p>";

        const navigationButtons = lease.images && lease.images.length > 1
            ? `
                <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                    <button id="prev-image" class="btn btn-sm btn-outline-primary">Previous</button>
                    <button id="next-image" class="btn btn-sm btn-outline-primary">Next</button>
                </div>
            `
            : "";

        return `
            ${imageContent}
            ${navigationButtons}
            <h6>${lease.title}</h6>
            <p>${lease.street}, ${lease.city}, ${lease.state} ${lease.zip_code}</p>
            <p><strong>Price:</strong> $${lease.price}/month</p>
        `;
    };

    const infoWindow = new google.maps.InfoWindow({
        content: generateInfoWindowContent(),
    });

    marker.addListener("click", () => {
        infoWindow.open(map, marker);

        // Add event listeners for navigation buttons every time the InfoWindow is rendered
        google.maps.event.addListener(infoWindow, "domready", () => {
            const prevButton = document.getElementById("prev-image");
            const nextButton = document.getElementById("next-image");

            if (prevButton) {
                prevButton.addEventListener("click", () => {
                    currentImageIndex = (currentImageIndex - 1 + lease.images.length) % lease.images.length;
                    infoWindow.setContent(generateInfoWindowContent());
                });
            }

            if (nextButton) {
                nextButton.addEventListener("click", () => {
                    currentImageIndex = (currentImageIndex + 1) % lease.images.length;
                    infoWindow.setContent(generateInfoWindowContent());
                });
            }
        });
    });

    // Extend the bounds to include this marker's position
    bounds.extend({ lat: lat, lng: lng });

    // Add marker to the map's marker list
    map.markers.push(marker);

    map.fitBounds(bounds);
}