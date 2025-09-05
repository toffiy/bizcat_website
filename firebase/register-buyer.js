import { auth, db } from './firebase_config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ✅ Get redirect parameter from URL (if any)
const urlParams = new URLSearchParams(window.location.search);
let redirectUrl = urlParams.get("redirect");

// ✅ If redirect is a relative path, make it absolute
if (redirectUrl && !redirectUrl.startsWith("http")) {
  const base = window.location.origin + (window.location.pathname.includes("/") ? "/" : "");
  redirectUrl = base + redirectUrl.replace(/^\/+/, "");
}

window.register = async function () {
  const firstName = document.getElementById("regFirstName").value.trim();
  const lastName = document.getElementById("regLastName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const address = document.getElementById("regAddress").value.trim();
  const phone = document.getElementById("regPhone").value.trim();

  if (!firstName || !lastName || !email || !password) {
    alert("Please fill in all required fields.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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

    // ✅ After registration, go to redirect URL if provided
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.href = "index.html"; // default buyer home
    }
  } catch (error) {
    console.error("Registration error:", error);
    alert("Error: " + error.message);
  }
};

// ✅ Back button preserves redirect param if it exists
document.getElementById("backBtn").addEventListener("click", () => {
  if (redirectUrl) {
    window.location.href = `login.html?redirect=${encodeURIComponent(redirectUrl)}`;
  } else {
    window.location.href = "login.html";
  }
});
