import { auth, db } from './firebase_config.js';
import {
  onAuthStateChanged,
  EmailAuthProvider,
  linkWithCredential,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const errorMsg = document.getElementById("errorMsg");

// Detect which page we are on
if (document.getElementById("sendOtpBtn")) {
  // ===== PHONE VERIFICATION PAGE =====
  const phoneInput = document.getElementById("phoneNumber");
  const sendOtpBtn = document.getElementById("sendOtpBtn");
  const otpInput = document.getElementById("otpCode");
  const verifyOtpBtn = document.getElementById("verifyOtpBtn");

  let confirmationResult;

  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'normal' });

  sendOtpBtn.addEventListener("click", async () => {
    const phoneNumber = phoneInput.value.trim();
    if (!phoneNumber) {
      errorMsg.textContent = "Enter your phone number.";
      return;
    }
    try {
      confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      errorMsg.textContent = "OTP sent to your phone.";
    } catch (error) {
      errorMsg.textContent = "Error sending OTP: " + error.message;
    }
  });

  verifyOtpBtn.addEventListener("click", async () => {
    const code = otpInput.value.trim();
    if (!code) {
      errorMsg.textContent = "Enter the OTP.";
      return;
    }
    try {
      await confirmationResult.confirm(code);
      sessionStorage.setItem("phoneVerified", "true");
      sessionStorage.setItem("verifiedPhone", phoneInput.value.trim());
      window.location.href = "set_password.html";
    } catch (error) {
      errorMsg.textContent = "Invalid OTP: " + error.message;
    }
  });

} else if (document.getElementById("submitPassword")) {
  // ===== PASSWORD PAGE =====

  // 🚨 SAFEGUARD: Redirect if phone not verified
  if (sessionStorage.getItem("phoneVerified") !== "true") {
    window.location.href = "verify_phone.html";
  }

  const passwordInput = document.getElementById("newPassword");
  const confirmInput = document.getElementById("confirmPassword");
  const submitBtn = document.getElementById("submitPassword");

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
        const credential = EmailAuthProvider.credential(user.email, pw);
        await linkWithCredential(user, credential);

        await setDoc(buyerRef, {
          passwordSet: true,
          phone: sessionStorage.getItem("verifiedPhone"),
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Clear session storage after success
        sessionStorage.removeItem("phoneVerified");
        sessionStorage.removeItem("verifiedPhone");

        window.location.href = "index.html";
      } catch (error) {
        errorMsg.textContent = "Failed to set password. Try again.";
        submitBtn.disabled = false;
        submitBtn.textContent = "Set Password";
      }
    });
  });
}
