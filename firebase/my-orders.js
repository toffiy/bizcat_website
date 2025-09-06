import { db, auth } from './firebase_config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collectionGroup, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

async function loadOrders(userId) {
  const container = document.getElementById("ordersContainer");
  container.innerHTML = "<p class='loading-text'>Loading your orders...</p>";

  try {
    const ordersSnapshot = await getDocs(collectionGroup(db, "orders"));
    container.innerHTML = "";

    if (ordersSnapshot.empty) {
      container.innerHTML = "<p class='loading-text'>No orders found.</p>";
      return;
    }

    let hasOrders = false;

    for (const orderDoc of ordersSnapshot.docs) {
      const order = orderDoc.data();
      if (order.buyerId !== userId) continue;
      hasOrders = true;

      const sellerId = orderDoc.ref.parent.parent.id;
      let sellerName = "Unknown Seller";
      try {
        const sellerRef = doc(db, "sellers", sellerId);
        const sellerSnap = await getDoc(sellerRef);
        if (sellerSnap.exists()) {
          const sellerData = sellerSnap.data();
          sellerName = `${sellerData.firstName || ""} ${sellerData.lastName || ""}`.trim() || sellerData.email || sellerId;
        }
      } catch (e) {
        console.warn("Seller fetch failed:", e);
      }

      const orderDate = order.timestamp?.toDate?.().toLocaleString() || "N/A";

      const card = document.createElement("div");
      card.className = "order-card";

      card.innerHTML = `
        <div class="order-header">
          <img src="${order.productImage || 'https://via.placeholder.com/60'}" class="product-img" alt="${order.productName || 'Product'}" />
          <div class="order-info">
            <h3>${order.productName || "N/A"}</h3>
            <span class="status-badge status-${(order.status || "pending").toLowerCase()}">
              ${order.status || "Pending"}
            </span>
          </div>
        </div>
        <div class="order-details">
          <strong>Total:</strong> ₱${(order.totalAmount || 0).toLocaleString()}<br>
          <strong>Quantity:</strong> ${order.quantity || 0}<br>
          <strong>Ordered On:</strong> ${orderDate}<br>
          <strong>Seller:</strong> ${sellerName}
        </div>
      `;

      container.appendChild(card);
    }

    if (!hasOrders) {
      container.innerHTML = "<p class='loading-text'>You have no orders.</p>";
    }

  } catch (error) {
    console.error("Error loading orders:", error);
    container.innerHTML = "<p class='loading-text'>Error loading orders. Check console.</p>";
  }
}

// Auth listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadOrders(user.uid);
  } else {
    const container = document.getElementById("ordersContainer");
    container.innerHTML = "<p class='loading-text'>Please log in to see your orders.</p>";
  }
});
