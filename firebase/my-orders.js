import { db, auth } from './firebase_config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collectionGroup, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

async function loadOrders(userId) {
  const tableBody = document.getElementById("ordersTableBody");
  tableBody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Loading your orders...</td></tr>";

  try {
    const ordersSnapshot = await getDocs(collectionGroup(db, "orders"));
    tableBody.innerHTML = "";

    if (ordersSnapshot.empty) {
      tableBody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>No orders found.</td></tr>";
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

      // Main row (minimal view)
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Product">
          <img src="${order.productImage || 'https://via.placeholder.com/50'}" class="product-img" alt="${order.productName || 'Product'}" />
          ${order.productName || "N/A"}
        </td>
        <td data-label="Total">₱${(order.totalAmount || 0).toLocaleString()}</td>
        <td data-label="Status">
          <span class="status-badge status-${(order.status || "pending").toLowerCase()}">
            ${order.status || "Pending"}
          </span>
        </td>
        <td data-label="Details">
          <button class="details-btn" onclick="toggleDetails(this)">View</button>
        </td>
      `;

      // Hidden row (full details)
      const detailsRow = document.createElement("tr");
      detailsRow.classList.add("order-details");
      detailsRow.style.display = "none";
      detailsRow.innerHTML = `
        <td colspan="4">
          <strong>Quantity:</strong> ${order.quantity || 0}<br>
          <strong>Ordered On:</strong> ${orderDate}<br>
          <strong>Seller:</strong> ${sellerName}
        </td>
      `;

      tableBody.appendChild(tr);
      tableBody.appendChild(detailsRow);
    }

    if (!hasOrders) {
      tableBody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>You have no orders.</td></tr>";
    }

  } catch (error) {
    console.error("Error loading orders:", error);
    tableBody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Error loading orders. Check console.</td></tr>";
  }
}

// Toggle visibility of details row
window.toggleDetails = function(button) {
  const detailsRow = button.closest("tr").nextElementSibling;
  const isVisible = detailsRow.style.display === "table-row";
  detailsRow.style.display = isVisible ? "none" : "table-row";
  button.textContent = isVisible ? "View" : "Hide";
};

// Auth listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Logged in as:", user.uid);
    loadOrders(user.uid);
  } else {
    document.getElementById("ordersTableBody").innerHTML =
      "<tr><td colspan='4' style='text-align:center;'>Please log in to see your orders.</td></tr>";
  }
});
