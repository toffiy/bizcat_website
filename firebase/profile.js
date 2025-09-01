import { auth, db } from './firebase_config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// DOM elements
const firstNameView = document.getElementById('firstNameView');
const lastNameView = document.getElementById('lastNameView');
const emailView = document.getElementById('emailView');
const phoneView = document.getElementById('phoneView');
const addressView = document.getElementById('addressView');
const profileImg = document.getElementById('profileImg');
const logoutBtn = document.getElementById('logoutBtn');
const editBtn = document.getElementById('editBtn');
const photoInput = document.getElementById('photoInput');
const photoUploadSection = document.getElementById('photoUploadSection');

// Modal elements
const confirmModal = document.getElementById('confirmModal');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

// Success modal elements
const successModal = document.getElementById('successModal');
const successMessage = document.getElementById('successMessage');
const successOk = document.getElementById('successOk');

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = "ddpj3pix5";
const CLOUDINARY_UPLOAD_PRESET = "bizcat_unsigned";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

let currentUserUID = null;
let editMode = false;
let originalData = {}; // store original profile data

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUserUID = user.uid;

  try {
    const buyerDocRef = doc(db, "buyers", user.uid);
    const buyerSnap = await getDoc(buyerDocRef);

    if (buyerSnap.exists()) {
      originalData = buyerSnap.data();
      renderProfile(originalData);
    } else {
      originalData = { email: user.email, photoURL: "default-avatar.png" };
      renderProfile(originalData);
    }
  } catch (err) {
    console.error("Error loading profile:", err);
    showSuccessModal("Failed to load profile data."); // reuse modal for errors
  }
});

function renderProfile(buyer) {
  firstNameView.textContent = buyer.firstName || '';
  lastNameView.textContent = buyer.lastName || '';
  emailView.textContent = buyer.email || '';
  phoneView.textContent = buyer.phone || '';
  addressView.textContent = buyer.address || '';
  profileImg.src = buyer.photoURL || "default-avatar.png";
}

editBtn.addEventListener('click', () => {
  if (!editMode) {
    toggleEditMode(true);
  } else {
    // Show custom confirmation modal
    confirmModal.style.display = 'flex';
  }
});

// Modal actions
confirmYes.addEventListener('click', async () => {
  confirmModal.style.display = 'none';

  const updatedData = {
    firstName: document.getElementById('firstNameInput').value,
    lastName: document.getElementById('lastNameInput').value,
    email: document.getElementById('emailInput').value,
    phone: document.getElementById('phoneInput').value,
    address: document.getElementById('addressInput').value,
    photoURL: originalData.photoURL // default to existing photo
  };

  // If new photo selected, upload to Cloudinary
  if (photoInput.files[0]) {
    const formData = new FormData();
    formData.append("file", photoInput.files[0]);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
    const data = await res.json();
    if (data.secure_url) {
      updatedData.photoURL = data.secure_url;
    }
  }

  try {
    await updateDoc(doc(db, "buyers", currentUserUID), updatedData);

    // Update originalData and re-render
    originalData = updatedData;
    renderProfile(updatedData);
    toggleEditMode(false);

    // Show success modal instead of alert
    showSuccessModal("Profile updated successfully!");
  } catch (err) {
    console.error("Error updating profile:", err);
    showSuccessModal("Something went wrong. Please try again.");
  }
});

confirmNo.addEventListener('click', () => {
  confirmModal.style.display = 'none';
  // Cancel edit mode and restore original data
  renderProfile(originalData);
  toggleEditMode(false);
});

function toggleEditMode(enable) {
  editMode = enable;
  photoUploadSection.style.display = enable ? 'flex' : 'none';
  editBtn.textContent = enable ? 'Save Changes' : 'Edit Profile';

  const fields = [
    { id: 'firstNameView', name: 'firstName' },
    { id: 'lastNameView', name: 'lastName' },
    { id: 'emailView', name: 'email' },
    { id: 'phoneView', name: 'phone' },
    { id: 'addressView', name: 'address' }
  ];

  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (enable) {
      const value = el.textContent;
      el.outerHTML = `<input type="text" id="${f.name}Input" value="${value}">`;
    } else {
      const input = document.getElementById(`${f.name}Input`);
      const value = input ? input.value : '';
      input.outerHTML = `<span id="${f.id}">${value}</span>`;
    }
  });
}

// Success modal helper
function showSuccessModal(message) {
  successMessage.textContent = message;
  successModal.style.display = 'flex';
}

// Close success modal
successOk.addEventListener('click', () => {
  successModal.style.display = 'none';
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
const backBtn = document.getElementById('backBtn');

backBtn.addEventListener('click', () => {
  window.location.href = "index.html";
});