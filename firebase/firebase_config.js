// firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBakCwowq_U0OykmnH7UBPixCrg2rJglcM",
  authDomain: "bizcat-f3d7a.firebaseapp.com",
  projectId: "bizcat-f3d7a",
  appId: "1:956060768236:web:d8de82a061b77d71f152c9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
