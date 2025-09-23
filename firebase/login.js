import { auth, db } from './firebase_config.js';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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

// Google Sign-In (no OTP, no verify_email)
googleLoginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);

    // ✅ Wait for Firebase to confirm the user
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.warn("⚠️ No signed-in user after popup");
        return;
      }

      const fullName = user.displayName || "";
      const [firstName, ...rest] = fullName.split(" ");
      const lastName = rest.join(" ");

      const userRef = doc(db, "buyers", user.uid);
      const snapshot = await getDoc(userRef);

      if (!snapshot.exists()) {
        console.log("➡️ New user detected, creating Firestore record...");
        await setDoc(userRef, {
          uid: user.uid,
          firstName,
          lastName,
          email: user.email,
          photoURL: user.photoURL,
          phone: "",
          address: "",
          role: "buyer",
          passwordSet: false,   // ✅ always false for new users
          createdAt: serverTimestamp()
        });

        sessionStorage.setItem("pendingEmail", user.email);
        console.log("➡️ Redirecting new user to set_password.html");
        window.location.href = "set_password.html";
        return;
      }

      const userData = snapshot.data();
      console.log("➡️ Existing user data:", userData);
      sessionStorage.setItem("pendingEmail", user.email);

      if (userData?.passwordSet === true) {
        console.log("➡️ passwordSet is TRUE → go to app");
        redirectAfterLogin("index.html");
      } else {
        console.log("➡️ passwordSet is FALSE or missing → Set Password flow");
        window.location.href = "set_password.html";
      }
    });
  } catch (error) {
    console.error("Google login error:", error);
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
