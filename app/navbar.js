document.addEventListener("DOMContentLoaded", function() {
    async function loadNavbar() {
        const response = await fetch("/navbar.html");
        const navbarHTML = await response.text();
        const navbarPlaceholder = document.getElementById("navbar-placeholder");
        if (navbarPlaceholder) {
            navbarPlaceholder.innerHTML = navbarHTML;
            updateNavbarVisibility(); // Call this after the navbar is loaded
            attachLogoutHandler(); // Call this after the navbar is loaded
            checkPostLeaseAccess(); // Call this to handle post lease access
        }
    }

    async function checkSession() {
        try {
            const response = await fetch("/checkSession");
            if (response.ok) {
                const username = await response.text();
                document.getElementById("auth-link").innerHTML = `
            <li><span class="dropdown-item-text">Hello, ${username}</span></li>
            <li><a class="dropdown-item" href="javascript:void(0);" onclick="logout()">Logout</a></li>`;
                return true; // User is logged in
            } else {
                document.getElementById("auth-link").innerHTML = `
            <li><a class="dropdown-item" href="signup.html">Sign up</a></li>
            <li><a class="dropdown-item" href="login.html">Log in</a></li>`;
                return false; // User is logged out
            }
        } catch (error) {
            console.log("Not logged in");
            document.getElementById("auth-link").innerHTML = `
        <li><a class="dropdown-item" href="signup.html">Sign up</a></li>
        <li><a class="dropdown-item" href="login.html">Log in</a></li>`;
            return false; // Assume logged out on error
        }
    }

    async function updateNavbarVisibility() {
        const isLoggedIn = await checkSession();
        const favoritesTab = document.getElementById("favorites-tab");
        const myListingsTab = document.getElementById("my-listings-tab");

        if (favoritesTab) {
            favoritesTab.style.display = isLoggedIn ? "block" : "none";
        }
        if (myListingsTab) {
            myListingsTab.style.display = isLoggedIn ? "block" : "none";
        }
    }

    function attachLogoutHandler() {
        const logoutLink = document.getElementById("logout-link");
        if (logoutLink) {
            logoutLink.addEventListener('click', async (event) => {
                event.preventDefault();
                await fetch("/logout");
                alert("Logged out successfully!");
                window.location.href = "/"; // Changed to simple redirect
            });
        }
    }

    window.logout = async function logout() {
        await fetch("/logout");
        alert("Logged out successfully!");
        window.location.href = "/";
    }

    async function checkPostLeaseAccess() {
        if (window.location.pathname.includes("post.html")) {
            const isLoggedIn = await checkSession();
            if (!isLoggedIn) {
                alert("You must log in to post a lease.");
                window.location.href = "/login.html"; // Redirect to login page
            }
        }
    }

    loadNavbar(); // Load the navbar on each page
});