 import { auth } from './firebase_config.js';
    import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

    const loginForm = document.getElementById("loginForm");
    const errorMsg = document.getElementById("errorMsg");
    const goToRegister = document.getElementById("goToRegister");

    const urlParams = new URLSearchParams(window.location.search);
    let redirectUrl = urlParams.get("redirect");

    if (redirectUrl) {
      console.log(`🛈 Redirect detected: User came here from ${redirectUrl}`);
    } else {
      console.log("🛈 No redirect parameter — user came directly to login page.");
    }

    if (redirectUrl && !redirectUrl.startsWith("http")) {
      const base = window.location.origin + (window.location.pathname.includes("/") ? "/" : "");
      redirectUrl = base + redirectUrl.replace(/^\/+/, "");
    }

    function mapLoginError(error) {
      const code = String(error?.code || "").toLowerCase();
      const message = String(error?.message || "").toLowerCase();

     
      if (code === "auth/invalid-credential") {
        return "Invalid credentials. Please check your email and password.";
      }
      return `Login failed: ${error.message}`;
    }

    document.getElementById("email").addEventListener("input", () => errorMsg.textContent = "");
    document.getElementById("password").addEventListener("input", () => errorMsg.textContent = "");

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      console.log("Attempting login with:", email);

      try {
        await signInWithEmailAndPassword(auth, email, password);

        if (redirectUrl) {
          console.log(`✅ Login successful — redirecting to ${redirectUrl}`);
          window.location.href = redirectUrl;
        } else {
          console.log("✅ Login successful — redirecting to index.html");
          window.location.href = "index.html";
        }

      } catch (error) {
        console.error("❌ Login failed:", error.code, error.message);
        const message = mapLoginError(error);
        errorMsg.textContent = message;
      }
    });

    goToRegister.addEventListener("click", () => {
      if (redirectUrl) {
        console.log(`➡️ Going to register page with redirect: ${redirectUrl}`);
        window.location.href = `register.html?redirect=${encodeURIComponent(redirectUrl)}`;
      } else {
        console.log("➡️ Going to register page without redirect");
        window.location.href = "register.html";
      }
    });