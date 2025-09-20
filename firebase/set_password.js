import { auth, db } from './firebase_config.js';
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

const errorMsg = document.getElementById("errorMsg");
const passwordInput = document.getElementById("newPassword");
const confirmInput = document.getElementById("confirmPassword");
const submitBtn = document.getElementById("submitPassword");

const showErr = (m) => { if (errorMsg) errorMsg.textContent = m; };

// ✅ Redirect if email not verified via OTP
if (sessionStorage.getItem("emailVerified") !== "true") {
  window.location.href = "verify_email.html";
}

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
  showErr("");

  if (pw !== confirm) return showErr("Passwords do not match.");
  const issues = validatePassword(pw);
  if (issues.length) return showErr(issues.join(" "));

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      showErr("You must be logged in to set a password.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Set Password";
      return;
    }

    const uid = user.uid;
    const buyerRef = doc(db, "buyers", uid);
    const snapshot = await getDoc(buyerRef);
    if (!snapshot.exists()) {
      showErr("Buyer profile not found.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Set Password";
      return;
    }

    try {
      // Link password to Google account
      const credential = EmailAuthProvider.credential(user.email, pw);
      await linkWithCredential(user, credential);

      // Update Firestore
      await setDoc(buyerRef, {
        passwordSet: true,
        email: sessionStorage.getItem("verifiedEmail"),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Clear session
      sessionStorage.removeItem("emailVerified");
      sessionStorage.removeItem("verifiedEmail");

      window.location.href = "index.html";
    } catch (error) {
      showErr("Failed to set password. " + error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Set Password";
    }
  });
});
