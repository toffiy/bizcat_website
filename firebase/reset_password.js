import { auth } from './firebase_config.js';
import {
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const resetForm = document.getElementById("resetForm");
const resetMsg = document.getElementById("resetMsg");

resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("resetEmail").value.trim();

  if (!email) {
    resetMsg.style.color = "red";
    resetMsg.textContent = "Please enter your email.";
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email, {
      url: window.location.origin + "/login.html" // after reset, go back to login
    });
    resetMsg.style.color = "green";
    resetMsg.textContent = "✅ Reset link sent! Check your email inbox.";
  } catch (error) {
    console.error("Reset error:", error);
    resetMsg.style.color = "red";

    if (error.code === "auth/user-not-found") {
      resetMsg.textContent = "No account found with this email.";
    } else if (error.code === "auth/invalid-email") {
      resetMsg.textContent = "Invalid email address.";
    } else {
      resetMsg.textContent = "Error: " + error.message;
    }
  }
});
