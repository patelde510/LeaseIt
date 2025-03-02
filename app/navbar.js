document.addEventListener("DOMContentLoaded", function() {
    async function loadNavbar() {
        const response = await fetch("/navbar.html");
        const navbarHTML = await response.text();
        document.getElementById("navbar-placeholder").innerHTML = navbarHTML;
    }
    loadNavbar();

    async function checkSession() {
        try {
            const response = await fetch("/checkSession");
            if (response.ok) {
                const username = await response.text();
                document.getElementById("auth-link").innerHTML = `
            <li><span class="dropdown-item-text">Hello, ${username}</span></li>
            <li><a class="dropdown-item" href="javascript:void(0);" onclick="logout()">Logout</a></li>`;
            } else {
                document.getElementById("auth-link").innerHTML = `
            <li><a class="dropdown-item" href="signup.html">Sign up</a></li>
            <li><a class="dropdown-item" href="login.html">Log in</a></li>`;
            }
        } catch (error) {
            console.log("Not logged in");
            document.getElementById("auth-link").innerHTML = `
        <li><a class="dropdown-item" href="signup.html">Sign up</a></li>
        <li><a class="dropdown-item" href="login.html">Log in</a></li>`;
        }
    }

    window.logout = async function logout() {
        await fetch("/logout");
        alert("Logged out successfully!");
        window.location.reload();
    }

    checkSession();
});