async function fetchFavoriteLeases() {
    const response = await fetch("/api/favorites");
    const favoritesResultsContainer = document.getElementById("favorites-results");
    const noFavoritesMessage = document.getElementById("no-favorites");
    favoritesResultsContainer.innerHTML = "";

    if (!response.ok) {
        console.error("Failed to fetch favorites:", response.status);
        favoritesResultsContainer.innerHTML = "<p class='text-center'>Failed to load favorites.</p>";
        return;
    }

    const favoriteLeases = await response.json();

    if (favoriteLeases.length === 0) {
        noFavoritesMessage.classList.remove("d-none");
        return;
    }

    noFavoritesMessage.classList.add("d-none");

    favoriteLeases.forEach((lease, index) => {
        const leaseCard = document.createElement("div");
        leaseCard.classList.add("col-lg-3", "col-md-4", "col-sm-6", "mb-3");

        let carouselId = `carousel-fav-${index}`;
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
                        <button class="btn btn-danger btn-sm w-100 remove-favorite-btn" data-lease-id="${lease.lease_id}">Remove Favorite</button>
                    </div>
                </div>
            </div>
        `;
        favoritesResultsContainer.appendChild(leaseCard);
    });
}

document.addEventListener('click', async function(event) {
    if (event.target.classList.contains('remove-favorite-btn')) {
        const leaseId = event.target.dataset.leaseId;
        if (leaseId) {
            try {
                const response = await fetch('/api/favorites/remove', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ lease_id: leaseId })
                });

                if (response.ok) {
                    fetchFavoriteLeases();
                } else {
                    const errorData = await response.json();
                    alert(errorData.message || 'Failed to remove from favorites.');
                }
            } catch (error) {
                console.error('Error removing from favorites:', error);
                alert('An error occurred while removing from favorites.');
            }
        }
    }
});

fetchFavoriteLeases();