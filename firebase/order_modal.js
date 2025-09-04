// order_modal.js
import { db } from './firebase_config.js';
import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export async function openOrderModal({ buyerId, sellerId, productId, productName, price }) {
  let savedAddress = "";
  let productImage = "";

  try {
    const buyerSnap = await getDoc(doc(db, "buyers", buyerId));
    if (buyerSnap.exists()) savedAddress = buyerSnap.data().address || "";
  } catch (err) {
    console.warn("Could not fetch buyer address:", err);
  }

  try {
    const productSnap = await getDoc(doc(db, `sellers/${sellerId}/products/${productId}`));
    if (productSnap.exists()) {
      const productData = productSnap.data();
      productImage = productData.imageUrl || "https://via.placeholder.com/250x150";
    }
  } catch (err) {
    console.warn("Could not fetch product image:", err);
  }

  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.background = "rgba(0,0,0,0.5)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";
  modal.style.padding = "10px"; // prevent edge collision

  // Step 1
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
    ">
      <h3>Order: ${productName}</h3>
      <img src="${productImage}" alt="${productName}" style="width:100%;height:auto;max-height:200px;object-fit:cover;border-radius:8px;margin-bottom:10px;">
      <p>Price: ₱${price}</p>
      <label>Quantity:</label>
      <input type="number" id="order-qty" min="1" value="1" style="width:100%;margin-bottom:10px;font-size:inherit;padding:8px;box-sizing:border-box;">
      <div style="text-align:right;">
        <button id="cancel-order" style="margin-right:10px;">Cancel</button>
        <button id="next-step" style="background:#1d4ed8;color:white;padding:8px 12px;border:none;border-radius:5px;font-weight:bold;">Next</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector("#cancel-order").onclick = () => modal.remove();

  modal.querySelector("#next-step").onclick = () => {
    const qty = parseInt(document.getElementById("order-qty").value);
    if (!qty || qty < 1) {
      alert("Please enter a valid quantity.");
      return;
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
      ">
        <h3>Confirm Order</h3>
        <p><strong>Product:</strong> ${productName}</p>
        <p><strong>Quantity:</strong> ${qty}</p>
        <label>Delivery Address:</label>
        <textarea id="order-address" style="width:100%;margin-bottom:10px;font-size:inherit;padding:8px;box-sizing:border-box;">${safeAddress}</textarea>
        <label>Notes (optional):</label>
        <textarea id="order-notes" style="width:100%;margin-bottom:10px;font-size:inherit;padding:8px;box-sizing:border-box;"></textarea>
        <div style="text-align:right;">
          <button id="back-step" style="margin-right:10px;">Back</button>
          <button id="confirm-order" style="background:#1d4ed8;color:white;padding:8px 12px;border:none;border-radius:5px;font-weight:bold;">Place Order</button>
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

      const address = document.getElementById("order-address").value.trim();
      const notes = document.getElementById("order-notes").value.trim();

      if (!address) {
        alert("Address is required.");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Place Order";
        return;
      }

      try {
        await createOrder({ buyerId, sellerId, productId, qty, address, notes });

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
          ">
            <h3 style="color:green;">✅ Order Placed!</h3>
            <p>Your order for <strong>${productName}</strong> has been placed successfully.</p>
            <p>Quantity: ${qty}</p>
            <button id="close-success" style="margin-top:10px;background:#1d4ed8;color:white;padding:8px 12px;border:none;border-radius:5px;font-weight:bold;">Close</button>
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

async function createOrder({ buyerId, sellerId, productId, qty, address, notes }) {
  const productRef = doc(db, `sellers/${sellerId}/products/${productId}`);
  const productSnap = await getDoc(productRef);
  if (!productSnap.exists()) throw new Error("Product not found.");
  const product = productSnap.data();

  if (product.quantity < qty) throw new Error("Not enough stock available.");

  const buyerSnap = await getDoc(doc(db, "buyers", buyerId));
  if (!buyerSnap.exists()) throw new Error("Buyer not found.");
  const buyer = buyerSnap.data();

  await updateDoc(productRef, { quantity: increment(-qty) });

  await addDoc(collection(db, `sellers/${sellerId}/orders`), {
    buyerId,
    buyerFirstName: buyer.firstName || "",
    buyerLastName: buyer.lastName || "",
    buyerEmail: buyer.email || "",
    buyerPhone: buyer.phone || "",
    buyerAddress: address,
    buyerPhotoURL: buyer.photoURL || "",
    productId,
    productName: product.name,
    productImage: product.imageUrl || "",
    price: product.price,
    quantity: qty,
    totalAmount: product.price * qty,
    notes,
    status: "pending",
    timestamp: serverTimestamp(),
    lastUpdated: serverTimestamp()
  });
}
