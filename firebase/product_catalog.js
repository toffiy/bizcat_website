import { auth, db } from './firebase_config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { openOrderModal } from './order_modal.js';
import { injectReportModal, openReportModal } from './report_modal.js';

const sellerNameEl = document.getElementById("sellerName");
const sellerEmailEl = document.getElementById("sellerEmail");
const liveContainer = document.getElementById("live-container");
const productsDiv = document.getElementById("seller-products");
const reportBtn = document.getElementById("reportBtn");
const searchInput = document.getElementById("productSearch");

const urlParams = new URLSearchParams(window.location.search);
const sellerId = urlParams.get("seller");

// Inject modal once
injectReportModal();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    const currentUrl = window.location.href;
    window.location.href = `login.html?redirect=${encodeURIComponent(currentUrl)}`;
    return;
  }
  if (!sellerId) {
    productsDiv.innerHTML = "<p>No seller selected.</p>";
    return;
  }

  try {
    // Load seller info
    const sellerRef = doc(db, "sellers", sellerId);
    const sellerSnap = await getDoc(sellerRef);
    if (!sellerSnap.exists()) {
      productsDiv.innerHTML = "<p>Seller not found.</p>";
      return;
    }
    const sellerData = sellerSnap.data();
    sellerNameEl.textContent = `${sellerData.firstName || ''} ${sellerData.lastName || ''}`;
    sellerEmailEl.textContent = `Email: ${sellerData.email || 'N/A'}`;

    // Report button
    if (reportBtn) {
      reportBtn.addEventListener("click", () => openReportModal(sellerId));
    }

    // Live status
    onSnapshot(doc(db, "sellers", sellerId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        liveContainer.innerHTML = (data.isLive && data.fbLiveLink)
          ? `<a href="${data.fbLiveLink}" target="_blank" class="watch-live-btn">Watch Live</a>`
          : "";
      }
    });

    // Products
    onSnapshot(collection(db, `sellers/${sellerId}/products`), (snap) => {
      if (snap.empty) {
        productsDiv.innerHTML = "<p>No products found.</p>";
        return;
      }
      productsDiv.innerHTML = "";
      const products = [];
      snap.forEach(d => products.push({ id: d.id, ...d.data() }));

      // Sort visible first
      products.sort((a, b) => (b.isVisible === true ? 1 : -1) - (a.isVisible === true ? 1 : -1));

      products.forEach(p => {
        const isOrderable = p.isVisible && p.quantity > 0;
        const buttonLabel = isOrderable ? "Order Now" : (p.quantity === 0 ? "Out of Stock" : "Not Available");

        const card = document.createElement("div");
        card.className = `product-card ${isOrderable ? '' : 'disabled'}`;
        card.innerHTML = `
          <img src="${p.imageUrl || "https://via.placeholder.com/250x150"}" alt="${p.name}" class="product-image">
          <div class="product-details">
            <h4 class="product-name">${p.name || "Unnamed Product"}</h4>
            <p class="product-price">₱${p.price || 'N/A'}</p>
            <p class="product-stock">${p.quantity || 0} in stock</p>
            <button class="order-btn" ${isOrderable ? "" : "disabled"}>${buttonLabel}</button>
          </div>
        `;
        productsDiv.appendChild(card);

        // Order modal
        const orderBtn = card.querySelector(".order-btn");
        if (isOrderable && orderBtn) {
          orderBtn.addEventListener("click", () => {
            openOrderModal({
              buyerId: user.uid,
              sellerId,
              productId: p.id,
              productName: p.name,
              price: p.price
            });
          });
        }
      });

      // Search filter
      if (searchInput) {
        searchInput.addEventListener("input", () => {
          const query = searchInput.value.toLowerCase();
          document.querySelectorAll(".product-card").forEach(card => {
            const name = card.querySelector(".product-name").textContent.toLowerCase();
            card.style.display = name.includes(query) ? "flex" : "none";
          });
        });
      }
    });

  } catch (err) {
    console.error("Error loading seller/products:", err);
    productsDiv.innerHTML = "<p>Error loading products.</p>";
  }
});
