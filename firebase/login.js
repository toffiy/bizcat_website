import { auth } from './firebase_config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");
const goToRegister = document.getElementById("goToRegister");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "index.html";
  } catch (error) {
    errorMsg.textContent = "Login failed: " + error.message;
  }
});

goToRegister.addEventListener("click", () => {
  window.location.href = "register.html";
});
