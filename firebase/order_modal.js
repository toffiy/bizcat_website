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

  // 🔹 Fetch buyer's saved address
  try {
    const buyerRef = doc(db, "buyers", buyerId);
    const buyerSnap = await getDoc(buyerRef);
    if (buyerSnap.exists()) {
      savedAddress = buyerSnap.data().address || "";
    }
  } catch (err) {
    console.warn("Could not fetch buyer address:", err);
  }

  // 🔹 Fetch product image
  try {
    const productRef = doc(db, `sellers/${sellerId}/products/${productId}`);
    const productSnap = await getDoc(productRef);
    if (productSnap.exists()) {
      const productData = productSnap.data();
      productImage = productData.imageUrl || "https://via.placeholder.com/250x150";
    }
  } catch (err) {
    console.warn("Could not fetch product image:", err);
  }

  // Create modal container
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

  // Step 1: Quantity selection + product image
  modal.innerHTML = `
    <div style="background:#fff;padding:20px;border-radius:10px;width:300px;text-align:center;">
      <h3>Order: ${productName}</h3>
      <img src="${productImage}" alt="${productName}" style="width:100%;height:180px;object-fit:cover;border-radius:8px;margin-bottom:10px;">
      <p>Price: ₱${price}</p>
      <label>Quantity:</label>
      <input type="number" id="order-qty" min="1" value="1" style="width:100%;margin-bottom:10px;">
      <div style="text-align:right;">
        <button id="cancel-order" style="margin-right:10px;">Cancel</button>
        <button id="next-step" style="background:#ffcc00;padding:8px 12px;border:none;border-radius:5px;font-weight:bold;">Next</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Cancel closes modal
  modal.querySelector("#cancel-order").onclick = () => modal.remove();

  // Next → Step 2
  modal.querySelector("#next-step").onclick = () => {
    const qty = parseInt(document.getElementById("order-qty").value);
    if (!qty || qty < 1) {
      alert("Please enter a valid quantity.");
      return;
    }

    // Step 2: Address + Notes confirmation
    modal.innerHTML = `
      <div style="background:#fff;padding:20px;border-radius:10px;width:300px;">
        <h3>Confirm Order</h3>
        <p><strong>Product:</strong> ${productName}</p>
        <p><strong>Quantity:</strong> ${qty}</p>
        <label>Delivery Address:</label>
        <textarea id="order-address" style="width:100%;margin-bottom:10px;">${savedAddress}</textarea>
        <label>Notes (optional):</label>
        <textarea id="order-notes" style="width:100%;margin-bottom:10px;"></textarea>
        <div style="text-align:right;">
          <button id="back-step" style="margin-right:10px;">Back</button>
          <button id="confirm-order" style="background:#ffcc00;padding:8px 12px;border:none;border-radius:5px;font-weight:bold;">Place Order</button>
        </div>
      </div>
    `;

    // Back → return to Step 1
    modal.querySelector("#back-step").onclick = () => {
      modal.remove();
      openOrderModal({ buyerId, sellerId, productId, productName, price });
    };

    // Confirm → place order
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

    // Step 3: Success message inside modal
    modal.innerHTML = `
      <div style="background:#fff;padding:20px;border-radius:10px;width:300px;text-align:center;">
        <h3 style="color:green;">✅ Order Placed!</h3>
        <p>Your order for <strong>${productName}</strong> has been placed successfully.</p>
        <p>Quantity: ${qty}</p>
        <button id="close-success" style="margin-top:10px;background:#ffcc00;padding:8px 12px;border:none;border-radius:5px;font-weight:bold;">Close</button>
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

// 🔹 Firestore order creation
// 🔹 Firestore order creation
async function createOrder({ buyerId, sellerId, productId, qty, address, notes }) {
  // 🔹 Fetch product
  const productRef = doc(db, `sellers/${sellerId}/products/${productId}`);
  const productSnap = await getDoc(productRef);
  if (!productSnap.exists()) throw new Error("Product not found.");
  const product = productSnap.data();

  // 🔹 Check stock
  if (product.quantity < qty) throw new Error("Not enough stock available.");

  // 🔹 Fetch buyer info
  const buyerRef = doc(db, "buyers", buyerId);
  const buyerSnap = await getDoc(buyerRef);
  if (!buyerSnap.exists()) throw new Error("Buyer not found.");
  const buyer = buyerSnap.data();

  // 🔹 Deduct stock
  await updateDoc(productRef, { quantity: increment(-qty) });

  // 🔹 Save order under seller
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


