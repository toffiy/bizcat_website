import { db, auth } from './firebase_config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collectionGroup, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

async function loadOrders(userId) {
  const tableBody = document.getElementById("ordersTableBody");
  tableBody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Loading your orders...</td></tr>";

  try {
    const ordersSnapshot = await getDocs(collectionGroup(db, "orders"));
    tableBody.innerHTML = "";

    if (ordersSnapshot.empty) {
      tableBody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No orders found.</td></tr>";
      return;
    }

    let hasOrders = false;

    for (const orderDoc of ordersSnapshot.docs) {
      const order = orderDoc.data();

      // Only include orders where buyerId matches logged-in user
      if (order.buyerId !== userId) continue;

      hasOrders = true;

      // Extract sellerId from parent path
      const sellerId = orderDoc.ref.parent.parent.id;

      // Fetch seller info
      let sellerName = "Unknown Seller";
      try {
        const sellerRef = doc(db, "sellers", sellerId);
        const sellerSnap = await getDoc(sellerRef);
        if (sellerSnap.exists()) {
          const sellerData = sellerSnap.data();
          sellerName = `${sellerData.firstName || ""} ${sellerData.lastName || ""}`.trim();
          if (!sellerName) {
            sellerName = sellerData.email || sellerId;
          }
        }
      } catch (e) {
        console.warn("Seller fetch failed:", e);
      }

      // Handle date from timestamp
      let orderDate = "N/A";
      if (order.timestamp?.toDate) {
        orderDate = order.timestamp.toDate().toLocaleString();
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <img src="${order.productImage || 'https://via.placeholder.com/50'}" class="product-img" alt="${order.productName || 'Product'}" />
          ${order.productName || "N/A"}
        </td>
        <td>${order.quantity || 0}</td>
        <td>₱${(order.totalAmount || 0).toLocaleString()}</td>
        <td>
          <span class="status-badge status-${(order.status || "pending").toLowerCase()}">
            ${order.status || "Pending"}
          </span>
        </td>
        <td>${orderDate}</td>
        <td>${sellerName}</td>
      `;
      tableBody.appendChild(tr);
    }

    if (!hasOrders) {
      tableBody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>You have no orders.</td></tr>";
    }

  } catch (error) {
    console.error("Error loading orders:", error);
    tableBody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Error loading orders. Check console.</td></tr>";
  }
}

// Listen for auth state and load orders for logged-in user
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Logged in as:", user.uid);
    loadOrders(user.uid);
  } else {
    document.getElementById("ordersTableBody").innerHTML =
      "<tr><td colspan='6' style='text-align:center;'>Please log in to see your orders.</td></tr>";
  }
});
