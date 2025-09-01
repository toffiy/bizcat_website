// product_catalog.js
import { auth, db } from './firebase_config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { openOrderModal } from './order_modal.js'; // ✅ Import modal

const productList = document.getElementById("product-list");
const urlParams = new URLSearchParams(window.location.search);
const sellerId = urlParams.get("seller");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    productList.innerHTML = "<p>Please log in to view products.</p>";
    return;
  }

  if (!sellerId) {
    productList.innerHTML = "<p>No seller selected.</p>";
    return;
  }

  try {
    const sellerRef = doc(db, "sellers", sellerId);
    const sellerSnap = await getDoc(sellerRef);

    if (!sellerSnap.exists()) {
      productList.innerHTML = "<p>Seller not found.</p>";
      return;
    }

    const sellerData = sellerSnap.data();

    productList.innerHTML = `
      <h2>${sellerData.firstName || ''} ${sellerData.lastName || ''}</h2>
      <p><strong>Email:</strong> ${sellerData.email || 'N/A'}</p>
      <h3>Products:</h3>
      <div id="seller-products"><em>Loading products...</em></div>
    `;

    const productsDiv = document.getElementById("seller-products");

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

      sortedProducts.sort((a, b) => (b.isVisible === true ? 1 : -1) - (a.isVisible === true ? 1 : -1));

      sortedProducts.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.style.marginBottom = "15px";
        card.style.border = "1px solid #ccc";
        card.style.padding = "10px";
        card.style.borderRadius = "8px";
        card.style.opacity = p.isVisible ? "1" : "0.5";

        const imageUrl = p.imageUrl || "https://via.placeholder.com/250x150";
        const buttonLabel = p.isVisible ? "Order Now" : "Not Available";
        const buttonStyle = p.isVisible
          ? 'background-color:#ffcc00; cursor:pointer;'
          : 'background-color:#ccc; cursor:not-allowed;';

        card.innerHTML = `
          <img src="${imageUrl}" alt="${p.name}" style="width:100%; height:180px; object-fit:cover; border-radius:8px; margin-bottom:10px; background-color:#eee;">
          <strong>${p.name || "Unnamed Product"}</strong><br>
          Price: ₱${p.price || 'N/A'}<br>
          Stock: ${p.quantity || 0}<br>
          <button style="margin-top:10px; padding:8px 12px; border:none; border-radius:5px; font-weight:bold; ${buttonStyle}" ${p.isVisible ? "" : "disabled"}>${buttonLabel}</button>
        `;

        productsDiv.appendChild(card);

        // ✅ Attach order modal trigger
        const orderBtn = card.querySelector("button");
        if (p.isVisible && orderBtn) {
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
