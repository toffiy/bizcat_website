import { auth, db } from './firebase_config.js';
import {
  onAuthStateChanged,
  EmailAuthProvider,
  linkWithCredential,
  RecaptchaVerifier,
  linkWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const errorMsg = document.getElementById("errorMsg");
const showErr = (m) => { if (errorMsg) errorMsg.textContent = m; };

const isVerifyPhone = !!document.getElementById("sendOtpBtn");
const isSetPassword = !!document.getElementById("submitPassword");

// ===== PHONE VERIFICATION PAGE =====
if (isVerifyPhone) {
  const phoneInput = document.getElementById("phoneNumber");
  const sendOtpBtn = document.getElementById("sendOtpBtn");
  const otpInput = document.getElementById("otpCode");
  const verifyOtpBtn = document.getElementById("verifyOtpBtn");

  let confirmationResult;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      showErr("Please sign in first.");
      sendOtpBtn.disabled = true;
      verifyOtpBtn.disabled = true;
      return;
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'normal' });
  });

  // Send OTP to whatever number is typed
  sendOtpBtn.addEventListener("click", async () => {
    const phoneNumber = phoneInput.value.trim();
    if (!phoneNumber) return showErr("Enter your phone number.");
    if (!phoneNumber.startsWith("+")) return showErr("Use E.164 format, e.g., +639123456789");

    try {
      const user = auth.currentUser;
      confirmationResult = await linkWithPhoneNumber(user, phoneNumber, window.recaptchaVerifier);
      showErr("OTP sent to " + phoneNumber);
    } catch (error) {
      showErr("Error sending OTP: " + error.message);
    }
  });

  // Verify OTP
  verifyOtpBtn.addEventListener("click", async () => {
    const code = otpInput.value.trim();
    if (!code) return showErr("Enter the OTP.");
    try {
      await confirmationResult.confirm(code);
      sessionStorage.setItem("phoneVerified", "true");
      sessionStorage.setItem("verifiedPhone", phoneInput.value.trim());
      window.location.href = "set_password.html";
    } catch (error) {
      showErr("Invalid OTP: " + error.message);
    }
  });
}

// ===== PASSWORD PAGE =====
if (isSetPassword) {
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
        const credential = EmailAuthProvider.credential(user.email, pw);
        await linkWithCredential(user, credential);

        await setDoc(buyerRef, {
          passwordSet: true,
          phone: sessionStorage.getItem("verifiedPhone"),
          updatedAt: serverTimestamp()
        }, { merge: true });

        sessionStorage.removeItem("phoneVerified");
        sessionStorage.removeItem("verifiedPhone");

        window.location.href = "index.html";
      } catch (error) {
        showErr("Failed to set password. " + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = "Set Password";
      }
    });
  });
}
