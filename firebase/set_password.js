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

// 🔹 On page load, check if password already set
onAuthStateChanged(auth, async (user) => {
  if (!user) return; // not logged in → stay here or redirect to login

  const buyerRef = doc(db, "buyers", user.uid);
  const snapshot = await getDoc(buyerRef);

  if (snapshot.exists() && snapshot.data().passwordSet === true) {
    console.log("➡️ Password already set, redirecting...");
    window.location.href = "index.html";
  }
});

// 🔹 Validate password
function validatePassword(pw) {
  const issues = [];
  if (pw.length < 8) issues.push("Min 8 characters.");
  if (!/[A-Z]/.test(pw)) issues.push("Include uppercase.");
  if (!/[a-z]/.test(pw)) issues.push("Include lowercase.");
  if (!/[0-9]/.test(pw)) issues.push("Include number.");
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push("Include symbol.");
  return issues;
}

// 🔹 Handle submit
submitBtn.addEventListener("click", async () => {
  const pw = passwordInput.value.trim();
  const confirm = confirmInput.value.trim();
  showErr("");

  if (pw !== confirm) return showErr("Passwords do not match.");
  const issues = validatePassword(pw);
  if (issues.length) return showErr(issues.join(" "));

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("You must be logged in to set a password.");

    const buyerRef = doc(db, "buyers", user.uid);

    // Link password to Google account
    const credential = EmailAuthProvider.credential(user.email, pw);
    await linkWithCredential(user, credential);

    // Update Firestore flag
    await setDoc(buyerRef, {
      passwordSet: true,
      email: user.email,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Clear any session flags if you were using them
    sessionStorage.removeItem("emailVerified");
    sessionStorage.removeItem("verifiedEmail");

    console.log("✅ Password set successfully, redirecting...");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Failed to set password:", error);
    showErr("Failed to set password. " + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = "Set Password";
  }
});
