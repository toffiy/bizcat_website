import { auth, db } from './firebase_config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const welcomeText = document.getElementById("welcomeText");
const sellerContainer = document.getElementById("sellerContainer");
const profileImg = document.getElementById("profileImg"); // avatar in header
const profileBtn = document.getElementById("profileBtn"); // clickable avatar

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    // Load buyer profile
    const buyerDocRef = doc(db, "buyers", user.uid);
    const buyerSnap = await getDoc(buyerDocRef);

    if (buyerSnap.exists()) {
      const buyer = buyerSnap.data();
      welcomeText.textContent = `Welcome, ${buyer.firstName || 'Buyer'}!`;

      // Set profile image if available
      if (buyer.photoURL) {
        profileImg.src = buyer.photoURL;
      } else {
        profileImg.src = "default-avatar.png"; // fallback
      }
    } else {
      welcomeText.textContent = `Welcome, ${user.email}!`;
      profileImg.src = "default-avatar.png";
    }

    // Clicking the avatar goes to profile.html
    profileBtn.addEventListener("click", () => {
      window.location.href = "profile.html";
    });

    // --- your existing seller listing logic below ---
    onSnapshot(collection(db, "sellers"), async (sellersSnapshot) => {
      sellerContainer.innerHTML = "";

      if (sellersSnapshot.empty) {
        sellerContainer.innerHTML = "<p>No sellers found.</p>";
        return;
      }

      for (const sellerDoc of sellersSnapshot.docs) {
        const sellerData = sellerDoc.data();
        const sellerId = sellerDoc.id;

        const initialProductsSnap = await getDocs(collection(db, `sellers/${sellerId}/products`));
        if (initialProductsSnap.empty) continue;

        const firstName = sellerData.firstName || '';
        const lastName = sellerData.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || '(No name)';
        const email = sellerData.email || 'N/A';

        const photoURL =
          sellerData.photoURL ||
          sellerData.profilePhotoUrl ||
          sellerData.profileImageUrl ||
          sellerData.avatarUrl ||
          null;

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

        const avatarEl = sellerDiv.querySelector(".seller-avatar");
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

        sellerDiv.querySelector(".catalog-btn").addEventListener("click", () => {
          window.location.href = `catalog.html?seller=${sellerId}`;
        });

        sellerContainer.appendChild(sellerDiv);

        const productCountEl = sellerDiv.querySelector(".product-count");
        const liveBadgeEl = sellerDiv.querySelector(".live-badge");

        onSnapshot(collection(db, `sellers/${sellerId}/products`), (productsSnap) => {
          const count = productsSnap.size;
          productCountEl.textContent = `${count} product${count !== 1 ? 's' : ''}`;

          let isLive = false;
          productsSnap.forEach((prodDoc) => {
            const product = prodDoc.data();
            if (product?.isVisible === true) isLive = true;
          });

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
        });
      }
    });

  } catch (error) {
    console.error("Error loading sellers:", error);
    sellerContainer.innerHTML = "<p>Failed to load sellers.</p>";
  }
});
