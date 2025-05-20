document.addEventListener('DOMContentLoaded', function() {
    const listingsContainer = document.getElementById('listings-container');

    async function fetchMyListings() {
        try {
            const response = await fetch('/api/my-listings');
            if (!response.ok) {
                const message = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${message}`);
            }
            const listings = await response.json();
            displayListings(listings);
        } catch (error) {
            console.error('Error fetching my listings:', error);
            listingsContainer.innerHTML = '<p class="text-danger">Failed to load your listings.</p>';
        }
    }

    function displayListings(listings) {
        if (listings.length === 0) {
            listingsContainer.innerHTML = '<p>You haven\'t posted any listings yet.</p>';
            return;
        }
        console.log(listings);

        listingsContainer.innerHTML = '';
        listings.forEach(listing => {
            const listingDiv = document.createElement('div');
            listingDiv.classList.add('card', 'mb-3');
            listingDiv.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">${listing.title}</h5>
                    <p class="card-text">Address: ${listing.street}, ${listing.city}, ${listing.state} ${listing.zip_code}</p>
                    <p class="card-text">Price: $${listing.price}</p>
                    <p class="card-text">Start Date: ${listing.start_date}</p>
                    <p class="card-text">End Date: ${listing.end_date}</p>
                    <p class="card-text">Status: ${listing.status}</p>
                    ${listing.status === 'available' ? `<button class="btn btn-danger btn-sm remove-listing-btn" data-lease-id="${listing.lease_id}">Remove</button>` : ''}
                </div>
            `;
            listingsContainer.appendChild(listingDiv);
        });

        attachRemoveListeners();
    }

    function attachRemoveListeners() {
        const removeButtons = document.querySelectorAll('.remove-listing-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', async function() {
                const leaseId = this.dataset.leaseId;
                if (confirm('Are you sure you want to remove this listing?')) {
                    try {
                        const response = await fetch(`/api/my-listings/${leaseId}/remove`, {
                            method: 'DELETE',
                        });
                        const result = await response.json();
                        if (response.ok) {
                            alert(result.message);
                            fetchMyListings(); // Refresh the listings
                        } else {
                            alert(result.error || 'Failed to remove listing.');
                        }
                    } catch (error) {
                        console.error('Error removing listing:', error);
                        alert('An unexpected error occurred.');
                    }
                }
            });
        });
    }

    fetchMyListings();
});