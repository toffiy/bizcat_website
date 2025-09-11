// seller_catalog.js
import { auth, db } from './firebase_config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const welcomeText = document.getElementById("welcome-name");
const leaderboardContainer = document.getElementById("leaderboardContainer");
const sellerListContainer = document.getElementById("sellerListContainer");
const sellersCountEl = document.getElementById("sellersCount");
const logoutLink = document.getElementById("logoutLink");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    // Load buyer profile
    const buyerDocRef = doc(db, "buyers", user.uid);
    const buyerSnap = await getDoc(buyerDocRef);
    if (welcomeText) {
      if (buyerSnap.exists()) {
        const buyer = buyerSnap.data();
        welcomeText.textContent = `${buyer.firstName || 'Buyer'}!`;
      } else {
        welcomeText.textContent = `${user.email}!`;
      }
    }

    // Logout handler
    if (logoutLink) {
      logoutLink.addEventListener("click", async (e) => {
        e.preventDefault();
        await signOut(auth);
        window.location.href = "login.html";
      });
    }

    // Listen to sellers collection
    onSnapshot(collection(db, "sellers"), async (sellersSnapshot) => {
      const sellersData = [];

      for (const sellerDoc of sellersSnapshot.docs) {
        const sellerId = sellerDoc.id;
        const sellerData = sellerDoc.data();

        // Count products
       // Count products
      const productsSnap = await getDocs(collection(db, `sellers/${sellerId}/products`));
      const totalProducts = productsSnap.size;
      // REMOVE this line:
      // if (totalProducts === 0) continue;

        if (totalProducts === 0) continue; // skip sellers with no products

        // Count orders
        const ordersSnap = await getDocs(collection(db, `sellers/${sellerId}/orders`));
        const totalOrders = ordersSnap.size;

        // Photo URL or fallback
        const photoURL =
          sellerData.photoURL ||
          sellerData.profilePhotoUrl ||
          sellerData.profileImageUrl ||
          sellerData.avatarUrl ||
          null;

        sellersData.push({
          id: sellerId,
          name: `${sellerData.firstName || ''} ${sellerData.lastName || ''}`.trim() || '(No name)',
          isLive: !!sellerData.isLive,
          totalOrders,
          totalProducts,
          photoURL
        });
      }

      // Sort by totalOrders descending
      sellersData.sort((a, b) => b.totalOrders - a.totalOrders);

      // Render leaderboard (top 3)
      renderLeaderboard(sellersData.slice(0, 3));

      // Render seller list (rest)
      renderSellerList(sellersData.slice(3));

      // Update sellers count
      if (sellersCountEl) {
        sellersCountEl.textContent = `Sellers (${sellersData.length})`;
      }
    });

  } catch (err) {
    console.error("Error loading sellers:", err);
    if (leaderboardContainer) leaderboardContainer.innerHTML = "<p>Failed to load sellers.</p>";
  }
});

function renderLeaderboard(topSellers) {
  if (!leaderboardContainer) return;
  leaderboardContainer.innerHTML = "";

  const rankMeta = [
    { cls: "gold",   icon: "👑", label: "#1 Top Seller" },
    { cls: "silver", icon: "🏆", label: "#2 Top Seller" },
    { cls: "bronze", icon: "🏅", label: "#3 Top Seller" },
  ];

  topSellers.forEach((seller, index) => {
    const { cls, icon, label } = rankMeta[index] || { cls: "standard", icon: "", label: "" };

    const card = document.createElement("div");
    card.className = `leaderboard-card ${cls}`;
    card.innerHTML = `
      <div class="avatar-wrapper">
        <div class="rank-icon">${icon}</div>
        <div class="seller-avatar">
          ${seller.photoURL
            ? `<img src="${seller.photoURL}" alt="${seller.name} avatar">`
            : `<div class="avatar-fallback">${getInitials(seller)}</div>`}
        </div>
      </div>

      <div class="badges">
        ${label ? `<span class="rank-badge">${label}</span>` : ""}
        <span class="status-badge ${seller.isLive ? "live" : "offline"}">
          ${seller.isLive ? "Live Now" : "Store Offline"}
        </span>
      </div>

      <h3 class="seller-name">${seller.name}</h3>

      <div class="orders-highlight">
        <span class="orders-number">${seller.totalOrders}</span>
        <span class="orders-label">Total Orders</span>
      </div>

      <p class="products-count">${seller.totalProducts} Products Available</p>

      <button class="visit-btn" ${seller.isLive ? "" : "disabled"}>
        ${seller.isLive ? "Visit Store" : "Store Offline"}
      </button>
    `;
    leaderboardContainer.appendChild(card);
  });
}


function renderSellerList(sellers) {
  if (!sellerListContainer) return;
  sellerListContainer.innerHTML = "";

  sellers.forEach((seller) => {
    const card = document.createElement("div");
    card.className = "seller-card";
    card.innerHTML = `
      <div class="seller-info">
        <div class="seller-avatar">
          ${seller.photoURL
            ? `<img src="${seller.photoURL}" alt="${seller.name} avatar">`
            : `<div class="avatar-fallback">${getInitials(seller)}</div>`}
        </div>
        <h4>${seller.name}</h4>
        <span class="status-badge ${seller.isLive ? "live" : "offline"}">
          ${seller.isLive ? "Live Now" : "Offline"}
        </span>
        <p class="products-count">${seller.totalProducts} Products</p>
      </div>
      <button class="catalog-btn">View Catalog</button>
    `;

    // Button click → go to seller's catalog
    card.querySelector(".catalog-btn").addEventListener("click", () => {
      window.location.href = `catalog.html?seller=${seller.id}`;
    });

    sellerListContainer.appendChild(card);
  });
}


function getInitials(seller) {
  const parts = seller.name.trim().split(" ");
  if (parts.length === 1) return parts[0][0] || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
