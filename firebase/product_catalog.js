// product_catalog.js
import { auth, db } from './firebase_config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { openOrderModal } from './order_modal.js';

const productList = document.getElementById("product-list");
const urlParams = new URLSearchParams(window.location.search);
const sellerId = urlParams.get("seller");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    const currentUrl = window.location.href;
    window.location.href = `login.html?redirect=${encodeURIComponent(currentUrl)}`;
    return;
  }

  if (!sellerId) {
    productList.innerHTML = "<p>No seller selected.</p>";
    return;
  }

  try {
    // Get seller info from sellers collection
    const sellerRef = doc(db, "sellers", sellerId);
    const sellerSnap = await getDoc(sellerRef);

    if (!sellerSnap.exists()) {
      productList.innerHTML = "<p>Seller not found.</p>";
      return;
    }

    const sellerData = sellerSnap.data();

    // Seller header with live container placeholder
    productList.innerHTML = `
      <div class="seller-header">
        <div class="seller-info">
          <h2 class="seller-name">${sellerData.firstName || ''} ${sellerData.lastName || ''}</h2>
          <p class="seller-email"><strong>Email:</strong> ${sellerData.email || 'N/A'}</p>
        </div>
        <div id="live-container"></div>
      </div>
      <h3 class="products-title">Products</h3>
      <div id="seller-products" class="products-grid"><em>Loading products...</em></div>
    `;

    const liveContainer = document.getElementById("live-container");

    // Listen to live status from users/{sellerId}
    onSnapshot(doc(db, "sellers", sellerId), (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.isLive && userData.fbLiveLink) {
          liveContainer.innerHTML = `
            <a href="${userData.fbLiveLink}" target="_blank" class="watch-live-btn">
              Watch Live
            </a>
          `;
        } else {
          liveContainer.innerHTML = "";
        }
      }
    });

    const productsDiv = document.getElementById("seller-products");

    // Listen to products in real time
    onSnapshot(collection(db, `sellers/${sellerId}/products`), (productsSnap) => {
      if (productsSnap.empty) {
        productsDiv.innerHTML = "<p>No products found.</p>";
        return;
      }

      productsDiv.innerHTML = "";

      const sortedProducts = [];
      productsSnap.forEach(docSnap => {
        sortedProducts.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort visible products first
      sortedProducts.sort((a, b) => (b.isVisible === true ? 1 : -1) - (a.isVisible === true ? 1 : -1));

      sortedProducts.forEach(p => {
        const isOrderable = p.isVisible && p.quantity > 0;
        const buttonLabel = isOrderable
          ? "Order Now"
          : (p.quantity === 0 ? "Out of Stock" : "Not Available");

        const card = document.createElement("div");
        card.className = `product-card ${isOrderable ? '' : 'disabled'}`;

        card.innerHTML = `
          <img src="${p.imageUrl || "https://via.placeholder.com/250x150"}" 
               alt="${p.name}" class="product-image">
          <div class="product-details">
            <h4 class="product-name">${p.name || "Unnamed Product"}</h4>
            <p class="product-price">₱${p.price || 'N/A'}</p>
            <p class="product-stock">${p.quantity || 0} in stock</p>
            <button class="order-btn" ${isOrderable ? "" : "disabled"}>${buttonLabel}</button>
          </div>
        `;

        productsDiv.appendChild(card);

        // Attach order modal trigger
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
    });

  } catch (err) {
    console.error("Error loading seller/products:", err);
    productList.innerHTML = "<p>Error loading products.</p>";
  }
});
