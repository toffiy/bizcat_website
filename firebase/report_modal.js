import { db, auth } from './firebase_config.js';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

let currentSellerId = null;

// Cloudinary config
const CLOUD_NAME = "ddpj3pix5";
const UPLOAD_PRESET = "bizcat_unsigned";

export function injectReportModal() {
  if (document.getElementById("reportModal")) return;

  const modalHTML = `
    <div id="reportModal" class="modal">
      <div class="modal-content">
        <span id="closeModal" class="close-btn">&times;</span>
        <h2>Report Seller</h2>
        <p class="modal-subtitle">Select a category, describe the issue, and upload evidence (1–3 photos).</p>
        <form id="reportForm">
          <div class="report-options">
            <label><input type="radio" name="reason" value="Scam"> Scam</label>
            <label><input type="radio" name="reason" value="Restricted items"> Selling or promoting restricted items</label>
            <label><input type="radio" name="reason" value="Inaccurate"> Inaccurate listing</label>
            <label><input type="radio" name="reason" value="Nudity"> Nudity or sexual activity</label>
            <label><input type="radio" name="reason" value="Violence"> Violence, hate or exploitation</label>
            <label><input type="radio" name="reason" value="Bullying"> Bullying or harassment</label>
          </div>

          <textarea id="reportDescription" placeholder="Describe the issue..." required></textarea>

          <input type="file" id="reportEvidence" accept="image/*" multiple required />

          <button type="submit" class="submit-report">Submit Report</button>
        </form>
        <div id="reportSuccess" class="report-success" style="display:none;">
          ✅ Report submitted successfully. Thank you!
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modal = document.getElementById("reportModal");
  const closeBtn = document.getElementById("closeModal");
  const form = document.getElementById("reportForm");
  const successMsg = document.getElementById("reportSuccess");
  const evidenceInput = document.getElementById("reportEvidence");

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
    resetModal();
  });
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      resetModal();
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const reason = form.reason.value;
    const description = document.getElementById("reportDescription").value.trim();
    const files = evidenceInput.files;
    const submitBtn = form.querySelector(".submit-report");

    if (!reason) {
      alert("Please select a category.");
      return;
    }
    if (!description) {
      alert("Please provide a description.");
      return;
    }
    if (files.length < 1 || files.length > 3) {
      alert("Please upload between 1 and 3 evidence photos.");
      return;
    }

    // Disable button to prevent double click
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const user = auth.currentUser;

      // Upload to Cloudinary
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        return data.secure_url;
      });

      const evidenceUrls = await Promise.all(uploadPromises);

      // Fetch seller info
      const sellerRef = doc(db, "sellers", currentSellerId);
      const sellerSnap = await getDoc(sellerRef);
      let sellerInfo = {};
      if (sellerSnap.exists()) {
        const data = sellerSnap.data();
        sellerInfo = {
          sellerEmail: data.email || null,
          sellerFirstName: data.firstName || null,
          sellerLastName: data.lastName || null
        };
      }

      // Save to Firestore
      await addDoc(collection(db, "sellers", currentSellerId, "reports"), {
        sellerId: currentSellerId,
        ...sellerInfo,
        buyerId: user ? user.uid : null,
        reason,
        description,
        evidence: evidenceUrls,
        createdAt: serverTimestamp()
      });

      form.style.display = "none";
      successMsg.style.display = "block";

      setTimeout(() => {
        modal.style.display = "none";
        resetModal();
      }, 2000);

    } catch (err) {
      console.error("Error saving report:", err);
      alert("Failed to submit report. Please try again.");
      // Re‑enable button if error
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Report";
    }
  });

  function resetModal() {
    form.reset();
    form.style.display = "block";
    successMsg.style.display = "none";
    const submitBtn = form.querySelector(".submit-report");
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Report";
  }
}

export function openReportModal(sellerId) {
  currentSellerId = sellerId;
  const modal = document.getElementById("reportModal");
  if (modal) modal.style.display = "flex";
}
    