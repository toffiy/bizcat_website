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

      // Main row
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

      // Details row
      const detailsRow = document.createElement("tr");
      detailsRow.classList.add("order-details");
      detailsRow.innerHTML = `
        <td colspan="4">
          <div class="details-content">
            <strong>Quantity:</strong> ${order.quantity || 0}<br>
            <strong>Ordered On:</strong> ${orderDate}<br>
            <strong>Seller:</strong> ${sellerName}
          </div>
        </td>
      `;

      // Initial hidden state
      detailsRow.querySelector(".details-content").style.height = "0px";
      detailsRow.querySelector(".details-content").style.overflow = "hidden";
      detailsRow.querySelector(".details-content").style.opacity = "0";
      detailsRow.querySelector(".details-content").style.transition = "height 0.3s ease, opacity 0.3s ease";

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

// Animate expand/collapse
window.toggleDetails = function(button) {
  const detailsRow = button.closest("tr").nextElementSibling;
  const content = detailsRow.querySelector(".details-content");
  const isExpanded = content.style.height !== "0px";

  if (isExpanded) {
    content.style.height = content.scrollHeight + "px"; // set current height
    requestAnimationFrame(() => {
      content.style.height = "0px";
      content.style.opacity = "0";
      button.textContent = "View";
    });
  } else {
    content.style.height = "auto";
    const fullHeight = content.scrollHeight + "px";
    content.style.height = "0px";
    content.style.opacity = "0";
    requestAnimationFrame(() => {
      content.style.height = fullHeight;
      content.style.opacity = "1";
      button.textContent = "Hide";
    });
  }
};

// Auth listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadOrders(user.uid);
  } else {
    document.getElementById("ordersTableBody").innerHTML =
      "<tr><td colspan='4' style='text-align:center;'>Please log in to see your orders.</td></tr>";
  }
});
