// login.js
import { auth } from './firebase_config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");
const goToRegister = document.getElementById("goToRegister");

// ✅ Get redirect parameter from URL (if any)
const urlParams = new URLSearchParams(window.location.search);
let redirectUrl = urlParams.get("redirect");

// If redirect is a relative path, make it absolute
if (redirectUrl && !redirectUrl.startsWith("http")) {
  const base = window.location.origin + (window.location.pathname.includes("/") ? "/" : "");
  redirectUrl = base + redirectUrl.replace(/^\/+/, "");
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);

    // ✅ If redirect param exists, go there; otherwise go to index
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.href = "index.html";
    }

  } catch (error) {
    errorMsg.textContent = "Login failed: " + error.message;
  }
});

goToRegister.addEventListener("click", () => {
  // ✅ Pass redirect param to register page if it exists
  if (redirectUrl) {
    window.location.href = `register.html?redirect=${encodeURIComponent(redirectUrl)}`;
  } else {
    window.location.href = "register.html";
  }
});
