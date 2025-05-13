document.addEventListener("DOMContentLoaded", function() {
    async function loadNavbar() {
        const response = await fetch("/navbar.html");
        const navbarHTML = await response.text();
        const navbarPlaceholder = document.getElementById("navbar-placeholder");
        if (navbarPlaceholder) {
            navbarPlaceholder.innerHTML = navbarHTML;
            updateNavbarVisibility();
            attachLogoutHandler();
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
                return true;
            } else {
                document.getElementById("auth-link").innerHTML = `
            <li><a class="dropdown-item" href="signup.html">Sign up</a></li>
            <li><a class="dropdown-item" href="login.html">Log in</a></li>`;
                return false;
            }
        } catch (error) {
            console.log("Not logged in");
            document.getElementById("auth-link").innerHTML = `
        <li><a class="dropdown-item" href="signup.html">Sign up</a></li>
        <li><a class="dropdown-item" href="login.html">Log in</a></li>`;
            return false;
        }
    }

    async function updateNavbarVisibility() {
        const isLoggedIn = await checkSession();
        const favoritesTab = document.getElementById("favorites-tab");
        if (favoritesTab) {
            favoritesTab.style.display = isLoggedIn ? "block" : "none";
        }
    }

    function attachLogoutHandler() {
        const logoutLink = document.getElementById("logout-link");
        if (logoutLink) {
            logoutLink.addEventListener('click', async (event) => {
                event.preventDefault();
                await fetch("/logout");
                alert("Logged out successfully!");
                window.location.reload();
            });
        }
    }

    window.logout = async function logout() {
        await fetch("/logout");
        alert("Logged out successfully!");
        window.location.reload();
    }

    loadNavbar();
});