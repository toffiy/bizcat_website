import { auth, db } from "./firebase_config.js";
import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Register buyer
window.register = async function () {
  const fullName = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const address = document.getElementById("regAddress").value.trim();
  const phone = document.getElementById("regPhone").value.trim();

  console.log("Registering:", email);

  // ✅ Split full name into first and last
  let firstName = "";
  let lastName = "";
  if (fullName.includes(" ")) {
    const nameParts = fullName.split(" ");
    firstName = nameParts.shift();
    lastName = nameParts.join(" ");
  } else {
    firstName = fullName;
    lastName = "";
  }

  try {
    // Create Auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("User created:", userCredential.user.uid);

    // Save buyer profile to Firestore
    await addDoc(collection(db, "buyers"), {
      uid: userCredential.user.uid,
      firstName,
      lastName,
      email,
      address,
      phone,
      createdAt: new Date()
    });

    alert("Registered successfully!");
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Registration error:", error);
    alert("Error: " + error.message);
  }
};
