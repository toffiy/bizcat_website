// seller_catalog.js
import { auth, db } from './firebase_config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Cache DOM references
const welcomeText     = document.getElementById("welcome-name");
const sellerContainer = document.getElementById("sellerContainer");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    // --- Load buyer profile ---
    const buyerDocRef = doc(db, "buyers", user.uid);
    const buyerSnap   = await getDoc(buyerDocRef);

    if (welcomeText) {
      if (buyerSnap.exists()) {
        const buyer = buyerSnap.data();
        welcomeText.textContent = `${buyer.firstName || 'Buyer'}!`;
      } else {
        welcomeText.textContent = `${user.email}!`;
      }
    }

    // --- Hook up hamburger menu links ---
    // More flexible selectors: match any href containing "profile" or "orders"
    const profileLink = document.querySelector('.menu-dropdown a[href*="profile"]');
    const ordersLink  = document.querySelector('.menu-dropdown a[href*="order"]');

    if (profileLink) {
      profileLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "profile.html";
      });
    }

    if (ordersLink) {
      ordersLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "order.html";
      });
    }

    // --- Seller listing logic ---
    onSnapshot(collection(db, "sellers"), async (sellersSnapshot) => {
      if (!sellerContainer) return;

      sellerContainer.innerHTML = "";

      if (sellersSnapshot.empty) {
        sellerContainer.innerHTML = "<p>No sellers found.</p>";
        return;
      }

      for (const sellerDoc of sellersSnapshot.docs) {
        const sellerData = sellerDoc.data();
        const sellerId   = sellerDoc.id;

        // Skip sellers with no products
        const initialProductsSnap = await getDocs(collection(db, `sellers/${sellerId}/products`));
        if (initialProductsSnap.empty) continue;

        const firstName = sellerData.firstName || '';
        const lastName  = sellerData.lastName || '';
        const fullName  = `${firstName} ${lastName}`.trim() || '(No name)';
        const email     = sellerData.email || 'N/A';

        const photoURL =
          sellerData.photoURL ||
          sellerData.profilePhotoUrl ||
          sellerData.profileImageUrl ||
          sellerData.avatarUrl ||
          null;

        // Build seller card
        const sellerDiv = document.createElement("div");
        sellerDiv.className = "seller-card";
        sellerDiv.innerHTML = `
          <div class="seller-card-header">
            <div class="seller-avatar" aria-label="Seller avatar"></div>
          </div>

          <div class="seller-card-body">
            <h3 class="seller-name">${fullName}</h3>
            <p class="seller-email">${email}</p>
            <p class="product-count"><em>Loading products…</em></p>
          </div>

          <div class="seller-card-footer">
            <span class="live-badge not-live">
              <span class="live-dot gray"></span>
              Not live
            </span>
            <button class="catalog-btn" type="button">View catalog</button>
          </div>
        `;

        // Avatar handling
        const avatarEl = sellerDiv.querySelector(".seller-avatar");
        if (avatarEl) {
          if (photoURL) {
            const img = document.createElement("img");
            img.alt = `${fullName} avatar`;
            img.src = photoURL;
            avatarEl.appendChild(img);
          } else {
            const initials =
              (firstName?.[0] || '') + (lastName?.[0] || (firstName ? '' : (email?.[0] || '')));
            const fallback = document.createElement("div");
            fallback.className = "avatar-fallback";
            fallback.textContent = initials.toUpperCase() || "🐾";
            avatarEl.appendChild(fallback);
          }
        }

        // Catalog button
        const catalogBtn = sellerDiv.querySelector(".catalog-btn");
        if (catalogBtn) {
          catalogBtn.addEventListener("click", () => {
            window.location.href = `catalog.html?seller=${sellerId}`;
          });
        }

        sellerContainer.appendChild(sellerDiv);

        // Product count + live badge updates
        const productCountEl = sellerDiv.querySelector(".product-count");
        const liveBadgeEl    = sellerDiv.querySelector(".live-badge");

        onSnapshot(collection(db, `sellers/${sellerId}/products`), (productsSnap) => {
          if (productCountEl) {
            const count = productsSnap.size;
            productCountEl.textContent = `${count} product${count !== 1 ? 's' : ''}`;
          }

          let isLive = false;
          productsSnap.forEach((prodDoc) => {
            const product = prodDoc.data();
            if (product?.isVisible === true) isLive = true;
          });

          if (liveBadgeEl) {
            if (isLive) {
              liveBadgeEl.classList.remove("not-live");
              liveBadgeEl.classList.add("live");
              liveBadgeEl.innerHTML = `
                <span class="live-dot green"></span>
                Live now
              `;
            } else {
              liveBadgeEl.classList.remove("live");
              liveBadgeEl.classList.add("not-live");
              liveBadgeEl.innerHTML = `
                <span class="live-dot gray"></span>
                Not live
              `;
            }
          }
        });
      }
    });

  } catch (error) {
    console.error("Error loading sellers:", error);
    if (sellerContainer) {
      sellerContainer.innerHTML = "<p>Failed to load sellers.</p>";
    }
  }
});
