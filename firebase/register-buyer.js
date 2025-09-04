import { auth, db } from './firebase_config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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
  } catch (error) {
    console.error("Registration error:", error);
    alert("Error: " + error.message);
  }
};

document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "login.html";
});
