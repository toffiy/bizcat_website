// seller_catalog.js
import { auth, db } from './firebase_config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  collection,
  getDocs,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const welcomeText = document.getElementById("welcome-name");
const leaderboardContainer = document.getElementById("leaderboardContainer");
const sellerListContainer = document.getElementById("sellerListContainer");
const sellersCountEl = document.getElementById("sellersCount");
const logoutLink = document.getElementById("logoutLink");

// 🔔 Notification elements
const notifBtn = document.getElementById("notifBtn");
const notifBadge = document.getElementById("notifBadge");
const notifList = document.getElementById("notifList");
const notifWindow = document.getElementById("notifWindow");
const closeNotifBtn = document.getElementById("closeNotifBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    // 🔒 Real-time listener for buyer status
    const buyerDocRef = doc(db, "buyers", user.uid);
    onSnapshot(buyerDocRef, (buyerSnap) => {
      if (buyerSnap.exists()) {
        const buyer = buyerSnap.data();

        // Update welcome text
        if (welcomeText) {
          welcomeText.textContent = `${buyer.firstName || 'Buyer'}!`;
        }

        // 🚨 If suspended, show block screen immediately
        if (buyer.status === "suspended") {
          showBlockScreen();
        }
      }
    });

    // Logout handler
    if (logoutLink) {
      logoutLink.addEventListener("click", async (e) => {
        e.preventDefault();
        const confirmLogout = confirm("Are you sure you want to log out?");
        if (!confirmLogout) return;
        await signOut(auth);
        window.location.href = "login.html";
      });
    }

    // 🔔 Notifications listener
    if (notifBtn && notifBadge && notifList) {
      const notifRef = collection(db, `buyers/${user.uid}/notifications`);
      onSnapshot(notifRef, (snapshot) => {
        // Update badge
        const unreadCount = snapshot.docs.filter(doc => !doc.data().read).length;
        if (unreadCount > 0) {
          notifBadge.textContent = unreadCount;
          notifBadge.classList.remove("hidden");
        } else {
          notifBadge.classList.add("hidden");
        }

        // Render into floating window (sorted by createdAt newest → oldest)
        notifList.innerHTML = "";
        snapshot.docs
          .sort((a, b) => {
            const aTime = a.data().createdAt?.toMillis?.() || 0;
            const bTime = b.data().createdAt?.toMillis?.() || 0;
            return bTime - aTime; // newest first
          })
          .forEach((docSnap) => {
            const notif = docSnap.data();
            const li = document.createElement("li");
            li.className = `notif-item ${notif.read ? "" : "unread"}`;
            li.innerHTML = `
              <span>${notif.message}</span>
              <span class="notif-time">${formatTimeAgo(notif.createdAt?.toDate())}</span>
            `;

            // Mark as read on click
            li.addEventListener("click", async () => {
              await updateDoc(doc(db, `buyers/${user.uid}/notifications/${docSnap.id}`), {
                read: true
              });
            });

            notifList.appendChild(li);
          });
      });

      // Toggle floating window
      notifBtn.addEventListener("click", () => {
        notifWindow.classList.toggle("hidden");
      });
      closeNotifBtn?.addEventListener("click", () => {
        notifWindow.classList.add("hidden");
      });
      document.addEventListener("click", (e) => {
        if (!notifWindow.contains(e.target) && !notifBtn.contains(e.target)) {
          notifWindow.classList.add("hidden");
        }
      });
    }

    // Listen to sellers collection
    onSnapshot(collection(db, "sellers"), async (sellersSnapshot) => {
      const sellersData = [];

      for (const sellerDoc of sellersSnapshot.docs) {
        const sellerId = sellerDoc.id;
        const sellerData = sellerDoc.data();

        // ✅ Skip suspended or inactive sellers
        if (sellerData.status === "suspended" || sellerData.status === "inactive") {
          continue;
        }

        // Count products
        const productsSnap = await getDocs(collection(db, `sellers/${sellerId}/products`));
        const totalProducts = productsSnap.size;
        if (totalProducts === 0) continue;

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

      <button class="visit-btn">View Catalog</button>
    `;

    card.querySelector(".visit-btn").addEventListener("click", () => {
      window.location.href = `catalog.html?seller=${seller.id}`;
    });

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

// ⏱️ Format timestamps as "just now / minute ago / hour ago / day ago"
function formatTimeAgo(date) {
  if (!date) return "";
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return "minute ago";
  if (diffHr < 24) return "hour ago";
  return "day ago";
}

// 🔒 Block screen helper
function showBlockScreen() {
  const blockScreen = document.getElementById("blockScreen");
  if (blockScreen) {
    blockScreen.classList.remove("hidden");

    // Disable scrolling behind overlay
    document.body.style.overflow = "hidden";

    // Hook up button
    const backBtn = document.getElementById("backToLoginBtn");
    if (backBtn) {
      backBtn.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "login.html";
      });
    }
  }
}
