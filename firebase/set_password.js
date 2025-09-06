// set-password.js
import { auth } from './firebase_config.js';
import {
  onAuthStateChanged,
  EmailAuthProvider,
  linkWithCredential
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from './firebase_config.js';

const passwordInput = document.getElementById("newPassword");
const confirmInput = document.getElementById("confirmPassword");
const submitBtn = document.getElementById("submitPassword");
const errorMsg = document.getElementById("errorMsg");

function validatePassword(pw) {
  const issues = [];
  if (pw.length < 8) issues.push("Min 8 characters.");
  if (!/[A-Z]/.test(pw)) issues.push("Include uppercase.");
  if (!/[a-z]/.test(pw)) issues.push("Include lowercase.");
  if (!/[0-9]/.test(pw)) issues.push("Include number.");
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push("Include symbol.");
  return issues;
}

submitBtn.addEventListener("click", async () => {
  const pw = passwordInput.value.trim();
  const confirm = confirmInput.value.trim();
  errorMsg.textContent = "";

  if (pw !== confirm) {
    errorMsg.textContent = "Passwords do not match.";
    return;
  }

  const issues = validatePassword(pw);
  if (issues.length) {
    errorMsg.textContent = issues.join(" ");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      errorMsg.textContent = "You must be logged in to set a password.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Set Password";
      return;
    }

    const uid = user.uid;
    const buyerRef = doc(db, "buyers", uid);
    const snapshot = await getDoc(buyerRef);

    if (!snapshot.exists()) {
      errorMsg.textContent = "Buyer profile not found.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Set Password";
      return;
    }

    try {
      // Link password to Firebase Auth
      const credential = EmailAuthProvider.credential(user.email, pw);
      await linkWithCredential(user, credential);

      // Update Firestore profile
      await setDoc(buyerRef, {
        passwordSet: true,
        updatedAt: serverTimestamp()
      }, { merge: true });

      window.location.href = "index.html";
    } catch (error) {
      console.error("❌ Failed to link password:", error.code, error.message);
      errorMsg.textContent = "Failed to set password. Try again or contact support.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Set Password";
    }
  });
});
