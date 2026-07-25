/* ============================================================================
   MARKA — Profile page logic
   Renders the signed-in user's header, stats, and three tab panels: Listings
   (with Active/Pending/Sold/Expired/Drafts sub-tabs, js/listings-store.js),
   Saved (Saved items + Saved searches, js/saved-searches-store.js), and
   Reviews — plus the account settings list. Shares NAV_LINKS / BOTTOM_NAV /
   priceStub() / favButtonHTML() / cardMediaStyle() / confirmModal() /
   refreshIcons() with the rest of the site via js/common.js, and its dataset
   with js/profile-data.js + js/listing-data.js.
   ============================================================================ */

const state = {
  favs: Object.fromEntries(MY_FAVORITE_IDS.map((id) => [id, true])),
  activeTab: "listings",
  listingStatus: "published", // "published" (shown as Active) | "pending" | "sold" | "expired" | "draft"
  savedView: "items", // "items" | "searches"
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

function listingCardHTML(item, statusOverride) {
  const meta = statusOverride ? LISTING_STATUS_META[statusOverride] : null;
  return `
    <div class="listing-card" data-listing-id="${item.id}" role="link" tabindex="0" aria-label="View ${item.title}">
      <div class="listing-media" style="background:linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})">
        ${meta ? `<span class="status-pill status-pill--${statusOverride}">${meta.label}</span>` : ""}
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

// A listing saved from the Sell page (draft, published/active, pending,
// sold, or expired) — same card shape, plus a status pill and edit/delete
// controls instead of a favorite button.
function ownedListingCardHTML(item) {
  const isDraft = item.status === "draft";
  const meta = LISTING_STATUS_META[item.status] || LISTING_STATUS_META.published;
  return `
    <div class="listing-card" data-listing-id="${item.id}" data-status="${item.status}" role="link" tabindex="0" aria-label="${isDraft ? "Continue editing" : "View"} ${item.title}">
      <div class="listing-media" style="${cardMediaStyle(item)}">
        <span class="status-pill status-pill--${item.status}">${meta.label}</span>
        <div class="card-owner-actions">
          <button type="button" class="card-owner-btn" data-edit-id="${item.id}" aria-label="Edit listing" title="Edit">
            <i data-lucide="pencil"></i>
          </button>
          <button type="button" class="card-owner-btn card-owner-btn--danger" data-delete-id="${item.id}" aria-label="Delete listing" title="Delete">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
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

// Renders whichever status sub-tab is active (Active/Pending/Sold/Expired
// map to a stored `status`; Drafts uses "draft"). Merges the demo listings
// in MY_LISTING_IDS with anything real posted from the Sell page so both
// sources show up together, sorted the same way the store already sorts.
function renderMyListings() {
  const grid = document.getElementById("myListingsGrid");
  const status = state.listingStatus;

  const owned = getUserListingsByStatus(status).map(userListingToRecord);
  const demo = MY_LISTING_IDS.filter((m) => m.status === status).map((m) => LISTING_DETAILS[m.id]);

  const ownedHTML = owned.map(ownedListingCardHTML).join("");
  const demoHTML = demo.map((item) => listingCardHTML(item, status)).join("");
  grid.innerHTML = ownedHTML + demoHTML;

  const empty = document.getElementById("myListingsEmpty");
  const isEmpty = owned.length === 0 && demo.length === 0;
  empty.hidden = !isEmpty;
  if (isEmpty) {
    document.getElementById("myListingsEmptyText").textContent =
      (LISTING_STATUS_META[status] || {}).emptyText || "Nothing here yet.";
  }
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

function savedSearchCardHTML(s) {
  return `
    <div class="saved-search-card" data-search-id="${s.id}" role="link" tabindex="0" aria-label="Run saved search ${savedSearchTitle(s)}">
      <div class="saved-search-icon"><i data-lucide="bookmark"></i></div>
      <div class="saved-search-body">
        <div class="saved-search-title truncate">${savedSearchTitle(s)}</div>
        <div class="saved-search-summary truncate">${savedSearchSummary(s)}</div>
      </div>
      <button type="button" class="card-owner-btn card-owner-btn--danger" data-delete-search="${s.id}" aria-label="Remove saved search" title="Remove">
        <i data-lucide="trash-2"></i>
      </button>
    </div>`;
}

function renderSavedSearches() {
  const list = document.getElementById("savedSearchesList");
  const empty = document.getElementById("savedSearchesEmpty");
  const searches = readSavedSearches();

  if (searches.length === 0) {
    list.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  list.innerHTML = searches.map(savedSearchCardHTML).join("");
}

function renderSavedView() {
  document.querySelectorAll("#savedSubTabs .sub-tab").forEach((tab) => {
    const isActive = tab.dataset.savedView === state.savedView;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  document.getElementById("savedItemsView").hidden = state.savedView !== "items";
  document.getElementById("savedSearchesView").hidden = state.savedView !== "searches";
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

function renderListingSubTabs() {
  document.querySelectorAll("#listingSubTabs .sub-tab").forEach((tab) => {
    const isActive = tab.dataset.listingStatus === state.listingStatus;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

function renderAll() {
  renderNavLinks(""); // no primary nav item is "current" on the profile page
  renderHeader();
  renderStats();
  renderMyListings();
  renderFavorites();
  renderSavedSearches();
  renderReviews();
  renderSettings();
  renderTabs();
  renderListingSubTabs();
  renderSavedView();
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

async function handleDeleteListing(id) {
  const item = getUserListing(id);
  const confirmed = await confirmModal({
    title: item && item.status === "draft" ? "Delete this draft?" : "Delete this listing?",
    message: "This will permanently remove it. This action can't be undone.",
    confirmLabel: "Delete",
    danger: true,
  });
  if (!confirmed) return;
  deleteUserListing(id);
  renderMyListings();
  refreshIcons();
}

async function handleDeleteSearch(id) {
  const confirmed = await confirmModal({
    title: "Remove this saved search?",
    message: "You can always save it again from the Browse page.",
    confirmLabel: "Remove",
    danger: true,
  });
  if (!confirmed) return;
  deleteSavedSearch(id);
  renderSavedSearches();
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

    const listingSubTab = e.target.closest("[data-listing-status]");
    if (listingSubTab) {
      state.listingStatus = listingSubTab.dataset.listingStatus;
      renderListingSubTabs();
      renderMyListings();
      refreshIcons();
      return;
    }

    const savedSubTab = e.target.closest("[data-saved-view]");
    if (savedSubTab) {
      state.savedView = savedSubTab.dataset.savedView;
      renderSavedView();
      refreshIcons();
      return;
    }

    // Owner controls take priority — they're nested inside a card that also
    // carries [data-listing-id], so they must be checked before that catch-all.
    const editBtn = e.target.closest("[data-edit-id]");
    if (editBtn) {
      window.location.href = `sell.html?edit=${editBtn.dataset.editId}`;
      return;
    }

    const deleteBtn = e.target.closest("[data-delete-id]");
    if (deleteBtn) {
      handleDeleteListing(deleteBtn.dataset.deleteId);
      return;
    }

    const deleteSearchBtn = e.target.closest("[data-delete-search]");
    if (deleteSearchBtn) {
      handleDeleteSearch(deleteSearchBtn.dataset.deleteSearch);
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

    const searchCard = e.target.closest("[data-search-id]");
    if (searchCard) {
      const search = readSavedSearches().find((s) => s.id === searchCard.dataset.searchId);
      if (search) window.location.href = savedSearchURL(search);
      return;
    }

    const card = e.target.closest("[data-listing-id]");
    if (card) {
      window.location.href =
        card.dataset.status === "draft"
          ? `sell.html?edit=${card.dataset.listingId}`
          : `listing.html?id=${card.dataset.listingId}`;
      return;
    }

    const settingsItem = e.target.closest(".settings-item--danger");
    if (settingsItem) {
      window.location.href = "login.html";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const searchCard = e.target.closest("[data-search-id]");
    if (searchCard) {
      e.preventDefault();
      const search = readSavedSearches().find((s) => s.id === searchCard.dataset.searchId);
      if (search) window.location.href = savedSearchURL(search);
      return;
    }
    const card = e.target.closest("[data-listing-id]");
    if (card) {
      e.preventDefault();
      window.location.href =
        card.dataset.status === "draft"
          ? `sell.html?edit=${card.dataset.listingId}`
          : `listing.html?id=${card.dataset.listingId}`;
    }
  });
});

window.addEventListener("load", refreshIcons);
