// buyerService.js
import { auth, db } from './firebase_config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export async function registerBuyer({ name, email, password, address, phone }) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    await addDoc(collection(db, "buyers"), {
      uid,
      name,
      email,
      address,
      phone
    });

    alert("Registered successfully!");
  } catch (error) {
    console.error("Registration error:", error);
    alert("Error: " + error.message);
  }
}
