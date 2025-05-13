function validateInput(input, condition) {
    if (condition) {
        input.style.border = "2px solid green";
    } else {
        input.style.border = "2px solid red";
    }
}

// Title validation
document.getElementById("title").addEventListener("input", function () {
    validateInput(this, this.value.trim().length > 0);
});

// Address validation
document.getElementById("address").addEventListener("input", function () {
    validateInput(this, this.value.length >= 5);
});

// City & State validation (only letters)
document.getElementById("city").addEventListener("input", function () {
    validateInput(this, /^[A-Za-z\s]+$/.test(this.value));
});

document.getElementById("state").addEventListener("input", function () {
    validateInput(this, /^[A-Za-z\s]+$/.test(this.value));
});

// Zip code validation (must be exactly 5 numbers)
document.getElementById("zip").addEventListener("input", function () {
    validateInput(this, /^\d{5}$/.test(this.value));
});

// Date validation (Start date must be before end date)
function validateDates() {
    const startDateInput = document.getElementById("start-date");
    const endDateInput = document.getElementById("end-date");

    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);

    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        if (startDate <= endDate) {
            validateInput(startDateInput, true);
            validateInput(endDateInput, true);
        } else {
            validateInput(startDateInput, false);
            validateInput(endDateInput, false);
        }
    } else {
        validateInput(startDateInput, !isNaN(startDate.getTime()));
        validateInput(endDateInput, !isNaN(endDate.getTime()));
    }
}

document.getElementById("start-date").addEventListener("input", validateDates);
document.getElementById("end-date").addEventListener("input", validateDates);

// Property details validation
document.getElementById("rent-price").addEventListener("input", function () {
    validateInput(this, this.value >= 0);
});

document.getElementById("bedrooms").addEventListener("input", function () {
    validateInput(this, this.value > 0);
});

document.getElementById("bathrooms").addEventListener("input", function () {
    validateInput(this, this.value > 0);
});

// Phone number validation (format: 123-456-7890)
document.getElementById("phone").addEventListener("input", function () {
    validateInput(this, /^[\d\s()-]+$/.test(this.value));
});

// Email validation (must contain "@" and ".")
document.getElementById("email").addEventListener("input", function () {
    validateInput(this, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value));
});

document.addEventListener("DOMContentLoaded", function () {

    // Prevent form submission if fields are invalid
    document.getElementById("lease-form").addEventListener("submit", async function (event) {
        const inputs = document.querySelectorAll("input, select");
        let allValid = true;

        inputs.forEach(input => {
            if (input.style.border === "2px solid red") {
                allValid = false;
            }
        });

        if (!allValid) {
            event.preventDefault();
            alert("Please correct invalid fields before submitting.");
        } else {
            event.preventDefault();

            const amenities = Array.from(document.querySelectorAll("input[type='checkbox']:checked")).map(cb => cb.id);

            const leaseData = {
                title: document.getElementById("title").value,
                description: document.getElementById("comments").value,
                price: document.getElementById("rent-price").value,
                start_date: document.getElementById("start-date").value,
                end_date: document.getElementById("end-date").value,
                property_type: document.getElementById("property-type").value,
                shared_space: document.getElementById("shared-space").value === "yes",
                furnished: document.getElementById("furnished").value === "yes",
                bathroom_type: document.getElementById("bathroom-type").value,
                bedrooms: document.getElementById("bedrooms").value,
                bathrooms: document.getElementById("bathrooms").value,
                street: document.getElementById("address").value,
                city: document.getElementById("city").value,
                state: document.getElementById("state").value,
                zip: document.getElementById("zip").value,
                phone: document.getElementById("phone").value,
                email: document.getElementById("email").value,
                amenities: amenities
            };

            const formData = new FormData();
            formData.append("leaseData", JSON.stringify(leaseData));

            imageFiles.forEach(file => {
                formData.append("images", file);
            });

            try {
                const response = await fetch("/post-lease", {
                    method: "POST",
                    body: formData
                });

                const data = await response.json();
                alert(data.message);
                if (response.ok) {
                    window.location.href = "index.html";
                }
            } catch (error) {
                console.error("Error posting lease:", error);
                alert("An error occurred while posting the lease. Check console for details.");
            }
        }
    });
    
    const imageUploadInput = document.getElementById("image-upload");
    const customUploadButton = document.getElementById("custom-upload-button");
    const dropArea = document.getElementById("drop-area");
    const imagePreviewContainer = document.getElementById("image-preview-container");
    const maxImages = 10;
    let imageFiles = [];

    customUploadButton.addEventListener("click", function () {
        imageUploadInput.click();
    });

    imageUploadInput.addEventListener("change", function () {
        handleFiles(imageUploadInput.files);
    });

    document.addEventListener("dragover", function (event) {
        event.preventDefault();
        dropArea.classList.add("bg-light");
    });

    document.addEventListener("dragleave", function () {
        dropArea.classList.remove("bg-light");
    });

    document.addEventListener("drop", function (event) {
        event.preventDefault();
        dropArea.classList.remove("bg-light");
        handleFiles(event.dataTransfer.files);
    });

    function handleFiles(files) {
        const fileArray = Array.from(files);
        if (imageFiles.length + fileArray.length > maxImages) {
            alert(`You can only upload up to ${maxImages} images.`);
            return;
        }

        fileArray.forEach(file => {
            imageFiles.push(file);
            displayImagePreview(file);
        });

        imageUploadInput.value = ""; // Clear the input

        // Hide the drag-and-drop area if there is at least one image
        if (imageFiles.length > 0) {
            dropArea.style.display = "none";
        }
    }

    function displayImagePreview(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const imagePreview = document.createElement("div");
            imagePreview.classList.add("image-preview", "position-relative", "m-2");
            imagePreview.style.width = "150px";
            imagePreview.style.height = "150px";

            const img = document.createElement("img");
            img.src = e.target.result;
            img.classList.add("img-thumbnail");
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";

            const removeButton = document.createElement("button");
            removeButton.classList.add("btn", "btn-danger", "btn-sm", "position-absolute", "top-0", "end-0", "m-1");
            removeButton.innerHTML = "&times;";
            removeButton.addEventListener("click", function () {
                imagePreview.remove();
                imageFiles = imageFiles.filter(f => f !== file);

                // Show the drag-and-drop area if there are no images
                if (imageFiles.length === 0) {
                    dropArea.style.display = "block";
                }
            });

            imagePreview.appendChild(img);
            imagePreview.appendChild(removeButton);
            imagePreviewContainer.appendChild(imagePreview);
        };
        reader.readAsDataURL(file);
    }

    // Prevent form submission on Enter key press CAUSING ISSUES WHEN USER PRESSES ENTER RANDOMLY
    document.getElementById("lease-form").addEventListener("keydown", function (event) {
        if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
            event.preventDefault();
        }
    });
});