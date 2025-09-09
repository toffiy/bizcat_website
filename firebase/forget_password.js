import { auth } from './firebaseConfig.js';
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

document.getElementById('resetBtn').addEventListener('click', () => {
  const email = document.getElementById('email').value;

  if (!email) {
    document.getElementById('message').innerText = "Please enter your email.";
    return;
  }

  sendPasswordResetEmail(auth, email)
    .then(() => {
      document.getElementById('message').innerText = "Password reset link sent to your email.";
    })
    .catch((error) => {
      document.getElementById('message').innerText = error.message;
    });
});
