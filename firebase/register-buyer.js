import { auth, db } from './firebase_config.js';
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Extract redirect param
const urlParams = new URLSearchParams(window.location.search);
const originalRedirectParam = urlParams.get("redirect");

function getSafeRedirectUrl(raw) {
  if (!raw) return null;
  try {
    if (/^https?:/i.test(raw)) {
      const u = new URL(raw);
      return u.origin === window.location.origin ? u.href : null;
    }
    const cleaned = raw.replace(/^\/+/, "");
    const u = new URL(cleaned, window.location.origin + "/");
    return u.href;
  } catch {
    return null;
  }
}
const safeRedirectUrl = getSafeRedirectUrl(originalRedirectParam);

// Input sanitizers
function sanitizeName(value) {
  return value.replace(/[^a-zA-Z\s'\-]/g, "").slice(0, 50);
}
function sanitizePhone(value) {
  return value.replace(/\D+/g, "").slice(0, 15);
}

const inputConfigs = [
  { id: "regFirstName", sanitize: sanitizeName },
  { id: "regLastName", sanitize: sanitizeName },
  { id: "regPhone", sanitize: sanitizePhone },
  { id: "regEmail" },
  { id: "regPassword" },
  { id: "regAddress" }
];

inputConfigs.forEach(({ id, sanitize }) => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener("input", (e) => {
      if (sanitize) e.target.value = sanitize(e.target.value);
      clearFieldError(id);
    });
  }
});

// Validators
function isValidName(name) {
  return /^[A-Za-z][A-Za-z\s'\-]{1,49}$/.test(name);
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
function getPasswordIssues(password) {
  const missing = [];
  if (password.length < 8) missing.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) missing.push("Uppercase letter");
  if (!/[a-z]/.test(password)) missing.push("Lowercase letter");
  if (!/[0-9]/.test(password)) missing.push("Number");
  if (!/[^A-Za-z0-9]/.test(password)) missing.push("Special character");
  return missing.length ? [`Missing: ${missing.join(", ")}`] : [];
}
function isValidPhone(phone) {
  if (!phone) return true;
  return /^[0-9]{10,15}$/.test(phone);
}
function isValidAddress(address) {
  return address.length >= 5;
}
async function isEmailExist(email) {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods.length > 0;
  } catch (err) {
    console.error("Email existence check failed:", err);
    return false;
  }
}

// Error display
function showFieldError(id, message) {
  const input = document.getElementById(id);
  if (!input) return;

  const errorEl = input.nextElementSibling;
  if (errorEl && errorEl.classList.contains("field-error")) {
    errorEl.textContent = message;
  }
}
function clearFieldError(id) {
  const input = document.getElementById(id);
  if (!input) return;

  const errorEl = input.nextElementSibling;
  if (errorEl && errorEl.classList.contains("field-error")) {
    errorEl.textContent = "";
  }
}

// UI helpers
function getValue(id) {
  const el = document.getElementById(id);
  return (el ? el.value : "").trim();
}
function setSubmittingState(isSubmitting) {
  const btn = document.getElementById("registerBtn");
  if (btn) {
    btn.disabled = isSubmitting;
    btn.textContent = isSubmitting ? "Registering..." : "Register";
  }
}

// Validation
function validateFields() {
  let isValid = true;

  const firstName = getValue("regFirstName");
  const lastName = getValue("regLastName");
  const email = getValue("regEmail");
  const password = getValue("regPassword");
  const phone = getValue("regPhone");
  const address = getValue("regAddress");

  ["regFirstName", "regLastName", "regEmail", "regPassword", "regPhone", "regAddress"].forEach(clearFieldError);

  if (!isValidName(firstName)) {
    showFieldError("regFirstName", "Min 2 characters.");
    isValid = false;
  }
  if (!isValidName(lastName)) {
    showFieldError("regLastName", "Min 2 characters.");
    isValid = false;
  }
  if (!isValidEmail(email)) {
    showFieldError("regEmail", "Invalid email format.");
    isValid = false;
  }

  const passwordIssues = getPasswordIssues(password);
  if (passwordIssues.length) {
    showFieldError("regPassword", passwordIssues.join(" "));
    isValid = false;
  }

  if (!isValidPhone(phone)) {
    showFieldError("regPhone", "Phone must be 10–15 digits.");
    isValid = false;
  }

  if (!isValidAddress(address)) {
    showFieldError("regAddress", "Please enter a valid address.");
    isValid = false;
  }

  return isValid;
}

// Registration handler
window.register = async function () {
  if (!navigator.onLine) {
    alert("You appear to be offline. Please connect to the internet and try again.");
    return;
  }

  if (!validateFields()) return;

  setSubmittingState(true);
  let userCredential = null;

  const firstName = getValue("regFirstName");
  const lastName = getValue("regLastName");
  const email = getValue("regEmail");
  const password = getValue("regPassword");
  const address = getValue("regAddress");
  const phone = getValue("regPhone");

  const emailExists = await isEmailExist(email);
  if (emailExists) {
    showFieldError("regEmail", "This email is already in use. Try logging in or use another email.");
    setSubmittingState(false);
    return;
  }

  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    await setDoc(doc(db, "buyers", uid), {
      firstName,
      lastName,
      email,
      address,
      phone,
      createdAt: serverTimestamp()
    });

    alert("Buyer registered successfully!");
    window.location.href = safeRedirectUrl || "index.html";
  } catch (error) {
    const isAuthError = String(error?.code || "").startsWith("auth/");
    const message = isAuthError ? mapAuthError(error) : mapFirestoreError(error);
    console.log("Caught Firebase error:", error.code);

    if (isAuthError && error.code === "auth/email-already-in-use") {
      showFieldError("regEmail", "This email is already in use. Try logging in or use another email.");
    } else {
      alert(message);
    }

    if (!isAuthError && userCredential?.user) {
      try {
        await userCredential.user.delete();
      } catch {}
    }

    console.error("Registration error:", error);
  } finally {
    setSubmittingState(false);
  }
};

// Back button
document.getElementById("backBtn").addEventListener("click", () => {
  const canPropagate = Boolean(safeRedirectUrl);
  if (canPropagate && originalRedirectParam) {
    window.location.href = `login.html?redirect=${encodeURIComponent(originalRedirectParam)}`;
  } else {
    window.location.href = "login.html";
  }
});

// Error mappers
function mapAuthError(error) {
  const code = String(error?.code || "").toLowerCase();
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already in use. Try logging in or use another email.";
    case "auth/invalid-email":
      return "The email address is invalid. Please check the format.";
    case "auth/weak-password":
      return "Your password is too weak. Use at least 8 chars with upper, lower, number, and symbol.";
    case "auth/operation-not-allowed":
      return "Email/password sign-up is disabled on this project. Contact support.";
    case "auth/network-request-failed":
      return "Network error while contacting the server. Check your connection.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/internal-error":
      return "Unexpected server error. Please try again later.";
    default:
      return `Sign-up failed: ${error?.message || "Unknown error"}`;
  }
}

function mapFirestoreError(error) {
  const code = String(error?.code || "").toLowerCase();
  switch (code) {
    case "permission-denied":
      return "You do not have permission to create this profile. Contact support.";
    case "unavailable":
      return "Service temporarily unavailable. Please try again shortly.";
    case "deadline-exceeded":
      return "Request timed out. Please check your connection and try again.";
    case "aborted":
      return "Request aborted. Please try again.";
    case "failed-precondition":
      return "Operation failed due to precondition. Please refresh and try again.";
    default:
      return `Saving profile failed: ${error?.message || "Unknown database error"}`;
  }
}