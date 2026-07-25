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
  reviewSort: "recent", // "recent" | "highest" | "lowest"
};

/* ------------------------------ Local persistence ------------------------------
   No backend yet, so edits made in the Edit profile / Get verified flows are
   stashed in localStorage and re-applied onto the PROFILE object (js/profile-
   data.js) on every load — same pattern as js/listings-store.js. */
const PROFILE_OVERRIDES_KEY = "marka_profile_overrides_v1";
const HELPFUL_REVIEWS_KEY = "marka_helpful_reviews_v1";

function readProfileOverrides() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_OVERRIDES_KEY) || "null") || {};
  } catch {
    return {};
  }
}

function writeProfileOverrides(partial) {
  const merged = { ...readProfileOverrides(), ...partial };
  try {
    localStorage.setItem(PROFILE_OVERRIDES_KEY, JSON.stringify(merged));
  } catch {
    // Storage full/unavailable — this is a local-only demo store, fail quietly.
  }
}

function applyProfileOverrides() {
  const o = readProfileOverrides();
  if (o.name) PROFILE.name = o.name;
  if (o.initials) PROFILE.initials = o.initials;
  if (o.loc) PROFILE.loc = o.loc;
  if (typeof o.bio === "string") PROFILE.bio = o.bio;
  if (o.avatarGrad) PROFILE.avatarGrad = o.avatarGrad;
  if (o.verificationSteps) PROFILE.verificationSteps = { ...PROFILE.verificationSteps, ...o.verificationSteps };
  if (typeof o.verified === "boolean") PROFILE.verified = o.verified;
}

function readHelpfulSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(HELPFUL_REVIEWS_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function toggleHelpful(reviewId) {
  const set = readHelpfulSet();
  if (set.has(reviewId)) set.delete(reviewId);
  else set.add(reviewId);
  try {
    localStorage.setItem(HELPFUL_REVIEWS_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

function initialsFromName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return PROFILE.initials;
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

/* --------------------------------- Renderers ---------------------------------- */
function renderHeader() {
  const avatarEl = document.getElementById("profileAvatar");
  avatarEl.textContent = PROFILE.initials;
  avatarEl.style.background = PROFILE.avatarGrad
    ? `linear-gradient(135deg, ${PROFILE.avatarGrad[0]}, ${PROFILE.avatarGrad[1]})`
    : "";
  document.getElementById("profileName").textContent = PROFILE.name;

  const verifiedBtn = document.getElementById("profileVerified");
  verifiedBtn.classList.toggle("verified-tag--pending", !PROFILE.verified);
  verifiedBtn.innerHTML = PROFILE.verified
    ? `<i data-lucide="badge-check"></i> Verified`
    : `<i data-lucide="shield"></i> Get verified`;
  verifiedBtn.setAttribute("aria-label", PROFILE.verified ? "Verified seller — view details" : "Get verified");

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

// Big average + 5→1 star breakdown bars, computed straight from
// PROFILE_REVIEWS so it always matches what's actually listed below.
function renderRatingSummary() {
  const total = PROFILE_REVIEWS.length;
  const avg = total ? PROFILE_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / total : PROFILE.rating;
  const counts = [5, 4, 3, 2, 1].map((star) => PROFILE_REVIEWS.filter((r) => r.rating === star).length);

  document.getElementById("ratingSummary").innerHTML = `
    <div class="rating-summary-score">
      <span class="rating-summary-value">${avg.toFixed(1)}</span>
      <div class="review-stars review-stars--lg">
        ${Array.from({ length: 5 }, (_, i) => `<i data-lucide="star" class="${i < Math.round(avg) ? "star-filled" : ""}"></i>`).join("")}
      </div>
      <span class="rating-summary-count">${total} review${total === 1 ? "" : "s"}</span>
    </div>
    <div class="rating-summary-bars">
      ${[5, 4, 3, 2, 1]
        .map((star, i) => {
          const count = counts[i];
          const pct = total ? Math.round((count / total) * 100) : 0;
          return `
          <div class="rating-bar-row">
            <span class="rating-bar-label">${star}<i data-lucide="star"></i></span>
            <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${pct}%"></div></div>
            <span class="rating-bar-count">${count}</span>
          </div>`;
        })
        .join("")}
    </div>`;
}

function sortedReviews() {
  const list = [...PROFILE_REVIEWS];
  if (state.reviewSort === "highest") list.sort((a, b) => b.rating - a.rating);
  else if (state.reviewSort === "lowest") list.sort((a, b) => a.rating - b.rating);
  return list; // "recent" — demo data is already newest-first
}

function renderReviews() {
  const list = document.getElementById("reviewsList");
  const helpfulSet = readHelpfulSet();
  const total = PROFILE_REVIEWS.length;
  document.getElementById("reviewsCount").textContent = `${total} review${total === 1 ? "" : "s"}`;

  list.innerHTML = sortedReviews()
    .map((r) => {
      const iMarkedIt = helpfulSet.has(r.id);
      const helpfulCount = (r.helpful || 0) + (iMarkedIt ? 1 : 0);
      return `
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
      <button type="button" class="review-helpful ${iMarkedIt ? "review-helpful--active" : ""}" data-helpful-id="${r.id}">
        <i data-lucide="thumbs-up"></i> Helpful${helpfulCount ? ` (${helpfulCount})` : ""}
      </button>
    </div>`;
    })
    .join("");
}

function renderSettings() {
  const list = document.getElementById("settingsList");
  list.innerHTML = SETTINGS_ITEMS.map((item) => {
    const isVerification = item.key === "verification";
    const isBlocked = item.key === "blocked";
    const blockedCount = isBlocked ? getBlockedUsers().length : 0;
    const hint = isVerification
      ? PROFILE.verified
        ? "You're a verified seller"
        : "Verify your email, phone & ID"
      : isBlocked
      ? blockedCount
        ? `${blockedCount} blocked user${blockedCount === 1 ? "" : "s"}`
        : "No blocked users"
      : item.hint;
    return `
    <button class="settings-item ${item.danger ? "settings-item--danger" : ""}" type="button" data-settings-key="${item.key || ""}">
      <span class="settings-item-icon"><i data-lucide="${item.icon}"></i></span>
      <span class="settings-item-text">
        <span class="settings-item-label">${item.label}</span>
        ${hint ? `<span class="settings-item-hint">${hint}</span>` : ""}
      </span>
      ${isVerification && PROFILE.verified ? `<i data-lucide="badge-check" class="settings-item-badge"></i>` : ""}
      <i data-lucide="chevron-right" class="settings-item-chevron"></i>
    </button>`;
  }).join("");
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

function renderReviewSortTabs() {
  document.querySelectorAll("#reviewsSort .sub-tab").forEach((tab) => {
    const isActive = tab.dataset.reviewSort === state.reviewSort;
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
  renderRatingSummary();
  renderReviews();
  renderSettings();
  renderTabs();
  renderListingSubTabs();
  renderReviewSortTabs();
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

/* ------------------------------ Edit profile modal ----------------------------- */
// GRAD_PALETTE (js/listings-store.js, loaded earlier on this page) already
// holds the site's avatar-gradient swatches — reused here so a picked color
// matches the ones auto-assigned to listing cards.
function avatarSwatchesHTML(selected) {
  return GRAD_PALETTE.map(([c1, c2], i) => {
    const isSelected = selected && selected[0] === c1 && selected[1] === c2;
    return `
    <button type="button" class="avatar-swatch ${isSelected ? "avatar-swatch--active" : ""}"
      style="background:linear-gradient(135deg, ${c1}, ${c2})"
      data-swatch-index="${i}" aria-label="Avatar color ${i + 1}"></button>`;
  }).join("");
}

function openEditProfileModal() {
  let chosenGrad = PROFILE.avatarGrad;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h2 class="modal-title">Edit profile</h2>
        <button type="button" class="modal-close" aria-label="Close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <label class="field-label" for="editName">Name</label>
        <input class="form-input" id="editName" type="text" maxlength="60" value="${PROFILE.name}" />

        <label class="field-label" for="editLoc">Location</label>
        <input class="form-input" id="editLoc" type="text" maxlength="60" value="${PROFILE.loc}" />

        <label class="field-label" for="editBio">Bio</label>
        <textarea class="field-textarea" id="editBio" maxlength="280">${PROFILE.bio}</textarea>
        <span class="field-char-count" id="editBioCount"></span>

        <span class="field-label">Avatar color</span>
        <div class="avatar-swatch-row" id="avatarSwatchRow">${avatarSwatchesHTML(chosenGrad)}</div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" data-action="cancel">Cancel</button>
        <button type="button" class="btn-primary" data-action="save">Save changes</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  refreshIcons();
  requestAnimationFrame(() => overlay.classList.add("open"));

  const bioField = overlay.querySelector("#editBio");
  const bioCount = overlay.querySelector("#editBioCount");
  const updateBioCount = () => (bioCount.textContent = `${bioField.value.length}/280`);
  updateBioCount();
  bioField.addEventListener("input", updateBioCount);

  function cleanup() {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 200);
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".modal-close") || e.target.closest('[data-action="cancel"]')) {
      return cleanup();
    }

    const swatch = e.target.closest("[data-swatch-index]");
    if (swatch) {
      chosenGrad = GRAD_PALETTE[Number(swatch.dataset.swatchIndex)];
      overlay.querySelectorAll(".avatar-swatch").forEach((el, i) => {
        el.classList.toggle("avatar-swatch--active", i === Number(swatch.dataset.swatchIndex));
      });
      return;
    }

    if (e.target.closest('[data-action="save"]')) {
      const name = overlay.querySelector("#editName").value.trim() || PROFILE.name;
      const loc = overlay.querySelector("#editLoc").value.trim() || PROFILE.loc;
      const bio = bioField.value.trim();

      PROFILE.name = name;
      PROFILE.initials = initialsFromName(name);
      PROFILE.loc = loc;
      PROFILE.bio = bio;
      PROFILE.avatarGrad = chosenGrad;

      writeProfileOverrides({
        name,
        initials: PROFILE.initials,
        loc,
        bio,
        avatarGrad: chosenGrad,
      });

      renderHeader();
      refreshIcons();
      cleanup();
    }
  });
}

/* ----------------------------- Get verified modal ------------------------------- */
function verificationStepsHTML(steps) {
  const items = [
    { key: "email", label: "Email address", desc: PROFILE.email, icon: "mail" },
    { key: "phone", label: "Phone number", desc: "Confirm you can receive an SMS code", icon: "phone" },
    { key: "id", label: "Government ID", desc: "Upload a photo ID to unlock the badge", icon: "id-card" },
  ];
  return items
    .map((item) => {
      const done = !!steps[item.key];
      return `
    <div class="verify-step ${done ? "verify-step--done" : ""}">
      <span class="verify-step-icon"><i data-lucide="${done ? "check" : item.icon}"></i></span>
      <span class="verify-step-text">
        <span class="verify-step-label">${item.label}</span>
        <span class="verify-step-desc">${done ? "Verified" : item.desc}</span>
      </span>
      ${done ? "" : `<button type="button" class="btn-secondary verify-step-btn" data-verify-step="${item.key}">${item.key === "id" ? "Upload" : "Verify"}</button>`}
    </div>`;
    })
    .join("");
}

function openVerificationModal() {
  const steps = { ...PROFILE.verificationSteps };
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  function paint() {
    const allDone = steps.email && steps.phone && steps.id;
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h2 class="modal-title">${allDone ? "You're verified" : "Get verified"}</h2>
          <button type="button" class="modal-close" aria-label="Close"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p class="modal-note">${
            allDone
              ? "Buyers can see you've confirmed your email, phone, and ID — your badge is live on your profile."
              : "Complete these steps to earn the verified badge and build buyer trust."
          }</p>
          <div class="verify-steps">${verificationStepsHTML(steps)}</div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-primary" data-action="close">${allDone ? "Done" : "Close"}</button>
        </div>
      </div>`;
    refreshIcons();
  }
  paint();
  requestAnimationFrame(() => overlay.classList.add("open"));

  function cleanup() {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 200);
  }

  overlay.addEventListener("click", async (e) => {
    if (e.target === overlay || e.target.closest(".modal-close") || e.target.closest('[data-action="close"]')) {
      return cleanup();
    }

    const stepBtn = e.target.closest("[data-verify-step]");
    if (stepBtn) {
      const key = stepBtn.dataset.verifyStep;
      stepBtn.disabled = true;
      stepBtn.textContent = "…";
      await new Promise((resolve) => setTimeout(resolve, 700));
      steps[key] = true;

      const allDone = steps.email && steps.phone && steps.id;
      PROFILE.verificationSteps = steps;
      if (allDone) PROFILE.verified = true;
      writeProfileOverrides({ verificationSteps: steps, verified: allDone ? true : PROFILE.verified });

      renderHeader();
      renderSettings();
      refreshIcons();
      paint();
    }
  });
}

function blockedUserRowHTML(user) {
  return `
    <div class="blocked-user-row">
      <div class="seller-avatar review-avatar">${user.initials}</div>
      <span class="blocked-user-name">${user.name}</span>
      <button type="button" class="btn-secondary blocked-user-unblock" data-unblock-name="${user.name}">Unblock</button>
    </div>`;
}

function openBlockedUsersModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  function paint() {
    const users = getBlockedUsers();
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h2 class="modal-title">Blocked users</h2>
          <button type="button" class="modal-close" aria-label="Close"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p class="modal-note">Blocked users can't message or call you, and their listings are hidden from browse and search. Unblock anyone here to reverse it.</p>
          ${
            users.length
              ? `<div class="blocked-user-list">${users.map(blockedUserRowHTML).join("")}</div>`
              : `<p style="margin:0; font-size:13px; color:var(--text-tertiary);">You haven't blocked anyone.</p>`
          }
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-primary" data-action="close">Close</button>
        </div>
      </div>`;
    refreshIcons();
  }
  paint();
  requestAnimationFrame(() => overlay.classList.add("open"));

  function cleanup() {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 200);
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".modal-close") || e.target.closest('[data-action="close"]')) {
      return cleanup();
    }
    const unblockBtn = e.target.closest("[data-unblock-name]");
    if (unblockBtn) {
      unblockUser(unblockBtn.dataset.unblockName);
      renderSettings();
      refreshIcons();
      paint();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyProfileOverrides();
  renderAll();

  document.getElementById("editProfileBtn").addEventListener("click", () => {
    openEditProfileModal();
  });

  window.addEventListener(BLOCKED_USERS_UPDATED_EVENT, () => {
    renderSettings();
    refreshIcons();
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

    const sortTab = e.target.closest("[data-review-sort]");
    if (sortTab) {
      state.reviewSort = sortTab.dataset.reviewSort;
      renderReviewSortTabs();
      renderReviews();
      refreshIcons();
      return;
    }

    const helpfulBtn = e.target.closest("[data-helpful-id]");
    if (helpfulBtn) {
      toggleHelpful(helpfulBtn.dataset.helpfulId);
      renderReviews();
      refreshIcons();
      return;
    }

    const verifiedBtn = e.target.closest("#profileVerified");
    if (verifiedBtn) {
      openVerificationModal();
      return;
    }

    const settingsKeyBtn = e.target.closest('[data-settings-key="verification"]');
    if (settingsKeyBtn) {
      openVerificationModal();
      return;
    }

    const blockedSettingsBtn = e.target.closest('[data-settings-key="blocked"]');
    if (blockedSettingsBtn) {
      openBlockedUsersModal();
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
