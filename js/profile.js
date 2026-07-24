/* ============================================================================
   MARKA — Profile page logic
   Renders the signed-in user's header, stats, and three tab panels (Listings,
   Favorites, Reviews) plus the account settings list. Shares NAV_LINKS /
   BOTTOM_NAV / priceStub() / favButtonHTML() / refreshIcons() with the rest
   of the site via js/common.js, and its dataset with js/profile-data.js +
   js/listing-data.js.
   ============================================================================ */

const state = {
  favs: Object.fromEntries(MY_FAVORITE_IDS.map((id) => [id, true])),
  activeTab: "listings",
};

/* --------------------------------- Renderers ---------------------------------- */
function renderHeader() {
  document.getElementById("profileAvatar").textContent = PROFILE.initials;
  document.getElementById("profileName").textContent = PROFILE.name;
  document.getElementById("profileVerified").hidden = !PROFILE.verified;
  document.getElementById("profileLoc").textContent = PROFILE.loc;
  document.getElementById("profileSince").textContent = PROFILE.memberSince;
  document.getElementById("profileRating").textContent = PROFILE.rating.toFixed(1);
  document.getElementById("profileBio").textContent = PROFILE.bio;
  document.title = `${PROFILE.name} — Marka`;
}

function renderStats() {
  const grid = document.getElementById("statsGrid");
  grid.innerHTML = PROFILE.stats
    .map(
      (s) => `
    <div class="stat-card">
      <i data-lucide="${s.icon}"></i>
      <span class="stat-value">${s.value}</span>
      <span class="stat-label">${s.label}</span>
    </div>`
    )
    .join("");
}

function listingCardHTML(item) {
  return `
    <div class="listing-card" data-listing-id="${item.id}" role="link" tabindex="0" aria-label="View ${item.title}">
      <div class="listing-media" style="background:linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})">
        ${favButtonHTML(item.id, !!state.favs[item.id])}
      </div>
      <div class="listing-body">
        <div class="card-title truncate">${item.title}</div>
        <div class="card-loc"><i data-lucide="map-pin"></i><span>${item.loc}</span></div>
        <div class="card-footer">
          ${priceStub(item.price)}
          <span class="card-time">${item.condition}</span>
        </div>
      </div>
    </div>`;
}

function renderMyListings() {
  const grid = document.getElementById("myListingsGrid");
  grid.innerHTML = MY_LISTING_IDS.map((id) => listingCardHTML(LISTING_DETAILS[id])).join("");
}

function renderFavorites() {
  const grid = document.getElementById("myFavoritesGrid");
  const emptyState = document.getElementById("favoritesEmpty");
  const favIds = Object.keys(state.favs)
    .filter((id) => state.favs[id])
    .map(Number);

  if (favIds.length === 0) {
    grid.innerHTML = "";
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  grid.innerHTML = favIds.map((id) => listingCardHTML(LISTING_DETAILS[id])).join("");
}

function renderReviews() {
  const list = document.getElementById("reviewsList");
  list.innerHTML = PROFILE_REVIEWS.map(
    (r) => `
    <div class="review-card">
      <div class="review-head">
        <div class="seller-avatar review-avatar">${r.initials}</div>
        <div class="review-headline">
          <span class="seller-name">${r.name}</span>
          <span class="review-date">${r.date}</span>
        </div>
        <div class="review-stars">
          ${Array.from({ length: 5 }, (_, i) => `<i data-lucide="star" class="${i < r.rating ? "star-filled" : ""}"></i>`).join("")}
        </div>
      </div>
      <p class="review-text">${r.text}</p>
    </div>`
  ).join("");
}

function renderSettings() {
  const list = document.getElementById("settingsList");
  list.innerHTML = SETTINGS_ITEMS.map(
    (item) => `
    <button class="settings-item ${item.danger ? "settings-item--danger" : ""}" type="button">
      <span class="settings-item-icon"><i data-lucide="${item.icon}"></i></span>
      <span class="settings-item-text">
        <span class="settings-item-label">${item.label}</span>
        ${item.hint ? `<span class="settings-item-hint">${item.hint}</span>` : ""}
      </span>
      <i data-lucide="chevron-right" class="settings-item-chevron"></i>
    </button>`
  ).join("");
}

function renderTabs() {
  document.querySelectorAll(".profile-tab").forEach((tab) => {
    const isActive = tab.dataset.tabPanel === state.activeTab;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  ["listings", "favorites", "reviews"].forEach((name) => {
    document.getElementById(`panel-${name}`).hidden = name !== state.activeTab;
  });
}

function renderAll() {
  renderNavLinks(""); // no primary nav item is "current" on the profile page
  renderHeader();
  renderStats();
  renderMyListings();
  renderFavorites();
  renderReviews();
  renderSettings();
  renderTabs();
  renderBottomNav("profile");
  refreshIcons();
}

/* --------------------------------- Events ------------------------------------- */
function toggleFav(id) {
  state.favs[id] = !state.favs[id];
  renderMyListings();
  renderFavorites();
  refreshIcons();
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();

  document.getElementById("editProfileBtn").addEventListener("click", () => {
    const btn = document.getElementById("editProfileBtn");
    const original = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="check"></i> Saved`;
    refreshIcons();
    setTimeout(() => {
      btn.innerHTML = original;
      refreshIcons();
    }, 1600);
  });

  document.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-tab-panel]");
    if (tab) {
      state.activeTab = tab.dataset.tabPanel;
      renderTabs();
      refreshIcons();
      return;
    }

    const favBtn = e.target.closest("[data-fav-id]");
    if (favBtn) {
      toggleFav(Number(favBtn.dataset.favId));
      return;
    }

    const tabBtn = e.target.closest("[data-tab]");
    if (tabBtn) {
      renderBottomNav(tabBtn.dataset.tab);
      refreshIcons();
      return;
    }

    const card = e.target.closest("[data-listing-id]");
    if (card) {
      window.location.href = `listing.html?id=${card.dataset.listingId}`;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest("[data-listing-id]");
    if (card) {
      e.preventDefault();
      window.location.href = `listing.html?id=${card.dataset.listingId}`;
    }
  });
});

window.addEventListener("load", refreshIcons);
