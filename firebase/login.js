import { auth } from './firebase_config.js';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from './firebase_config.js';

// DOM Elements
const loginForm = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");
const goToRegister = document.getElementById("goToRegister");
const googleLoginBtn = document.getElementById("googleLogin");

// Handle redirect parameter
const urlParams = new URLSearchParams(window.location.search);
let redirectUrl = urlParams.get("redirect");

if (redirectUrl && !redirectUrl.startsWith("http")) {
  const base = window.location.origin + (window.location.pathname.includes("/") ? "/" : "");
  redirectUrl = base + redirectUrl.replace(/^\/+/, "");
}

// Error mapping
function mapLoginError(error) {
  const code = String(error?.code || "").toLowerCase();
  if (code === "auth/invalid-credential") {
    return "Invalid credentials. Please check your email and password.";
  }
  return `Login failed: ${error.message}`;
}

// Clear error on input
document.getElementById("email").addEventListener("input", () => errorMsg.textContent = "");
document.getElementById("password").addEventListener("input", () => errorMsg.textContent = "");

// Email/password login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    redirectAfterLogin("index.html");
  } catch (error) {
    errorMsg.textContent = mapLoginError(error);
  }
});

// Google Sign-In with OTP check
googleLoginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const fullName = user.displayName || "";
    const [firstName, ...rest] = fullName.split(" ");
    const lastName = rest.join(" ");

    const userRef = doc(db, "buyers", user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      // New user → create record
      await setDoc(userRef, {
        uid: user.uid,
        firstName,
        lastName,
        email: user.email,
        photoURL: user.photoURL,
        phone: "",
        address: "",
        role: "buyer",
        passwordSet: false,
        createdAt: serverTimestamp()
      });

      // Redirect to set password
      sessionStorage.setItem("pendingEmail", user.email);
      window.location.href = "set_password.html";
      return;
    }

    const userData = snapshot.data();
    sessionStorage.setItem("pendingEmail", user.email);

    if (userData.passwordSet === true) {
      // ✅ Send OTP and redirect to verify
      try {
        const response = await fetch("https://bizcat-shop.42web.io/send_otp.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email: user.email })
      });


        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        window.location.href = "verify_email.html";
      } catch (err) {
        errorMsg.textContent = "Failed to send OTP. Please try again.";
        console.error("OTP error:", err);
      }

    } else {
      // No password yet → go to set password
      window.location.href = "set_password.html";
    }

  } catch (error) {
    console.error(error);
    errorMsg.textContent = "Google login failed. Please try again.";
  }
});

// Redirect logic
function redirectAfterLogin(defaultPath) {
  if (redirectUrl) {
    window.location.href = redirectUrl;
  } else {
    window.location.href = defaultPath;
  }
}

// Go to register page
goToRegister.addEventListener("click", () => {
  const target = redirectUrl
    ? `register.html?redirect=${encodeURIComponent(redirectUrl)}`
    : "register.html";
  window.location.href = target;
});
