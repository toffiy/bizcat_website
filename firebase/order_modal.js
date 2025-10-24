// order_modal.js
import { db } from './firebase_config.js';
import {
  doc,
  getDoc,
  collection,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export async function openOrderModal({ buyerId, sellerId, productId, productName, price }) {
  let savedAddress = "";
  let savedPhone = "";
  let productImage = "";
  let productStock = 0;

  try {
    const buyerSnap = await getDoc(doc(db, "buyers", buyerId));
    if (buyerSnap.exists()) {
      const buyerData = buyerSnap.data();
      savedAddress = buyerData.address || "";
      savedPhone = buyerData.phone || "";
    }
  } catch (err) {
    console.warn("Could not fetch buyer info:", err);
  }

  try {
    const productSnap = await getDoc(doc(db, `sellers/${sellerId}/products/${productId}`));
    if (productSnap.exists()) {
      const productData = productSnap.data();
      productImage = productData.imageUrl || "https://via.placeholder.com/250x150";
      productStock = productData.quantity || 0;
      productName = productData.name || productName;
    }
  } catch (err) {
    console.warn("Could not fetch product image:", err);
  }

  const modal = document.createElement("div");
  modal.id = "orderModal"; // 👈 important for suspension close
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  Object.assign(modal.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "9999",
    padding: "10px",
    overflowY: "auto"
  });

  modal.innerHTML = `
    <div style="
      background:#fff;
      padding:20px;
      border-radius:10px;
      width:100%;
      max-width:400px;
      box-sizing:border-box;
      text-align:center;
      font-size:clamp(14px, 2.5vw, 16px);
      max-height:90vh;
      overflow-y:auto;
    ">
      <h3>Order: ${productName}</h3>
      <img src="${productImage}" alt="${productName}" style="width:100%;height:auto;max-height:200px;object-fit:cover;border-radius:8px;margin-bottom:10px;">
      <p>Price: ₱${price}</p>
      <label>Quantity:</label>
      <input type="number" id="order-qty" min="1" max="${productStock}" value="1" 
        style="width:100%;margin-bottom:10px;font-size:inherit;padding:12px;box-sizing:border-box;">
      <p style="font-size:0.9em;color:gray;">Available stock: ${productStock}</p>
      <div style="text-align:right;">
        <button id="cancel-order" style="margin-right:10px;min-height:44px;">Cancel</button>
        <button id="next-step" style="background:#1d4ed8;color:white;padding:12px 16px;border:none;border-radius:5px;font-weight:bold;min-height:44px;">Next</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Focus trap
  const focusable = modal.querySelectorAll("button, input, textarea");
  let firstEl = focusable[0], lastEl = focusable[focusable.length - 1];
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") modal.remove();
    if (e.key === "Tab") {
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault(); lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault(); firstEl.focus();
      }
    }
  });

  // Clamp quantity live
  const qtyInput = modal.querySelector("#order-qty");
  qtyInput.addEventListener("input", () => {
    let val = parseInt(qtyInput.value);
    if (isNaN(val) || val < 1) {
      qtyInput.value = 1;
    } else if (val > productStock) {
      qtyInput.value = productStock;
    }
  });

  modal.querySelector("#cancel-order").onclick = () => modal.remove();

  modal.querySelector("#next-step").onclick = () => {
    let qty = parseInt(document.getElementById("order-qty").value);

    if (!qty || qty < 1) {
      alert("Please enter a valid quantity.");
      return;
    }

    if (qty > productStock) {
      qty = productStock;
      document.getElementById("order-qty").value = productStock;
      alert(`Maximum available stock is ${productStock}. Quantity adjusted.`);
    }

    const safeAddress = (savedAddress || "")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${}");

    modal.innerHTML = `
      <div style="
        background:#fff;
        padding:20px;
        border-radius:10px;
        width:100%;
        max-width:400px;
        box-sizing:border-box;
        font-size:clamp(14px, 2.5vw, 16px);
        max-height:90vh;
        overflow-y:auto;
      ">
        <h3>Confirm Order</h3>
        <p><strong>Product:</strong> ${productName}</p>
        <p><strong>Quantity:</strong> ${qty}</p>

        <label>Delivery Address:</label>
        <textarea id="order-address" maxlength="40"
          style="width:100%;margin-bottom:10px;font-size:inherit;padding:8px;box-sizing:border-box;min-height:60px;"
        >${safeAddress}</textarea>

        <label>Phone Number:</label>
        <input type="tel" id="order-phone" value="${savedPhone}" maxlength="11"
          style="width:100%;margin-bottom:10px;font-size:inherit;padding:8px;box-sizing:border-box;"
          placeholder="09XXXXXXXXX"
          oninput="this.value = this.value.replace(/[^0-9]/g, '')">

        <label>Notes (optional):</label>
        <textarea id="order-notes" maxlength="150"
          style="width:100%;margin-bottom:10px;font-size:inherit;padding:8px;box-sizing:border-box;min-height:60px;"
        ></textarea>

        <div style="text-align:right;">
          <button id="back-step" style="margin-right:10px;min-height:44px;">Back</button>
          <button id="confirm-order" style="background:#1d4ed8;color:white;padding:12px 16px;border:none;border-radius:5px;font-weight:bold;min-height:44px;">Place Order</button>
        </div>
      </div>
    `;

    modal.querySelector("#back-step").onclick = () => {
      modal.remove();
      openOrderModal({ buyerId, sellerId, productId, productName, price });
    };

    modal.querySelector("#confirm-order").onclick = async (e) => {
      const confirmBtn = e.target;
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Placing...";

      let address = document.getElementById("order-address").value.trim();
      let phone = document.getElementById("order-phone").value.trim();
      let notes = document.getElementById("order-notes").value.trim();

      phone = phone.replace(/\D/g, "");

      if (!address) {
        alert("Address is required.");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Place Order";
        return;
      }
      if (address.length > 40) {
        alert("Address cannot exceed 40 characters.");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Place Order";
        return;
      }

      if (!/^09\d{9}$/.test(phone)) {
        alert("Valid phone number is required (11 digits starting with 09).");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Place Order";
        return;
      }

      if (notes.length > 150) {
        alert("Notes cannot exceed 150 characters.");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Place Order";
        return;
      }

      try {
        await createOrder({ buyerId, sellerId, productId, qty, address, phone, notes });

        modal.innerHTML = `
          <div style="
            background:#fff;
            padding:20px;
            border-radius:10px;
            width:100%;
                        max-width:400px;
            font-size:clamp(14px, 2.5vw, 16px);
          ">
            <h3 style="color:green;">✅ Order Placed!</h3>
            <p>Your order for <strong>${productName}</strong> has been placed successfully.</p>
            <p>Quantity: ${qty}</p>
            <button id="close-success" style="margin-top:10px;background:#1d4ed8;color:white;padding:12px 16px;border:none;border-radius:5px;font-weight:bold;min-height:44px;">Close</button>
          </div>
        `;
        modal.querySelector("#close-success").onclick = () => modal.remove();

      } catch (err) {
        console.error("Error creating order:", err);
        alert(err.message || "Failed to place order.");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Place Order";
      }
    };
  };
}

// 🔒 Transaction-based order creation
async function createOrder({ buyerId, sellerId, productId, qty, address, phone, notes }) {
  const productRef = doc(db, `sellers/${sellerId}/products/${productId}`);
  const buyerRef = doc(db, "buyers", buyerId);
  const ordersCol = collection(db, `sellers/${sellerId}/orders`);

  await runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) throw new Error("Product not found.");
    const product = productSnap.data();

    if (product.quantity < qty) throw new Error("Not enough stock available.");

    const buyerSnap = await transaction.get(buyerRef);
    if (!buyerSnap.exists()) throw new Error("Buyer not found.");
    const buyer = buyerSnap.data();

    // Always update buyer address/phone if changed
    const updates = {};
    if (!buyer.address || buyer.address.trim() !== address.trim()) {
      updates.address = address;
    }
    if (!buyer.phone || buyer.phone.trim() !== phone.trim()) {
      updates.phone = phone;
    }
    if (Object.keys(updates).length > 0) {
      transaction.update(buyerRef, updates);
    }

    // Decrement stock
    transaction.update(productRef, { quantity: product.quantity - qty });

    // Create order document
    transaction.set(doc(ordersCol), {
      buyerId,
      buyerFirstName: buyer.firstName || "",
      buyerLastName: buyer.lastName || "",
      buyerEmail: buyer.email || "",
      buyerPhone: phone,
      buyerAddress: address,
      buyerPhotoURL: buyer.photoURL || "",
      productId,
      productName: product.name || "",
      productImage: product.imageUrl || "",
      price: product.price,
      quantity: qty,
      totalAmount: product.price * qty,
      notes,
      status: "pending",
      timestamp: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });
  });
}

// 👇 Exported so catalog.js can close the modal if suspended
export function closeOrderModal() {
  const modal = document.getElementById("orderModal");
  if (modal) {
    modal.remove();
  }
}
