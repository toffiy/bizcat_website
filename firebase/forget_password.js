import { auth } from './firebaseConfig.js';
import { RecaptchaVerifier, signInWithPhoneNumber } 
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

let confirmationResult;

// Show messages
function showMessage(msg) {
  document.getElementById('message').innerText = msg;
}

// Step 1: Setup reCAPTCHA
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  size: 'normal',
  callback: (response) => {
    // reCAPTCHA solved
  }
});

// Step 2: Send OTP
document.getElementById('sendOtpBtn').addEventListener('click', async () => {
  const phoneNumber = document.getElementById('phoneNumber').value.trim();
  if (!phoneNumber) return showMessage("Enter your phone number.");

  try {
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
    showMessage("OTP sent to your phone.");
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
  } catch (error) {
    showMessage("Error sending OTP: " + error.message);
  }
});

// Step 3: Verify OTP
document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
  const code = document.getElementById('otpCode').value.trim();
  if (!code) return showMessage("Enter the OTP.");

  try {
    const result = await confirmationResult.confirm(code);
    const user = result.user;
    showMessage("Phone verified. User ID: " + user.uid);
    // Here you can redirect to reset password page or dashboard
  } catch (error) {
    showMessage("Invalid OTP: " + error.message);
  }
});
