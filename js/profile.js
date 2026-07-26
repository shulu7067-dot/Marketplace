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
  favs: Object.fromEntries(getFavoriteIds().map((id) => [id, true])),
  activeTab: "listings",
  listingStatus: "published", // "published" (shown as Active) | "pending" | "sold" | "expired" | "draft"
  savedView: "items", // "items" | "searches"
  reviewSort: "recent", // "recent" | "highest" | "lowest"
};

/* ------------------------------ Supabase persistence ------------------------------
   The signed-in user (js/auth.js requireAuth()) plus real load/save of the
   PROFILE object (js/profile-data.js keeps the *shape* — field names, the
   stats/reviews/settings-menu constants — but the actual values now come
   from the "profiles" + "payment_methods" tables, see
   supabase/migrations/0001_auth_and_profiles.sql). Every call site that used
   to call writeProfileOverrides(partial) still does — it now pushes straight
   to Supabase instead of localStorage. */
const HELPFUL_REVIEWS_KEY = "marka_helpful_reviews_v1";

let currentUser = null;

// front-end PROFILE field name -> profiles table column name
const PROFILE_TO_COLUMN = {
  name: "full_name",
  loc: "location",
  bio: "bio",
  phone: "phone",
  avatarGrad: "avatar_gradient",
  avatarImage: "avatar_url",
  coverImage: "cover_url",
  notificationPrefs: "notification_prefs",
  twoFactorEnabled: "two_factor_enabled",
  verificationSteps: "verification_steps",
  verified: "verified",
};

// Fetches this user's profile + payment methods row(s) and maps them onto
// the shared PROFILE object (js/profile-data.js) so the rest of this file —
// which reads/writes PROFILE.* everywhere — doesn't need to change.
async function loadProfileFromSupabase() {
  const [{ data: row, error: profileError }, { data: cards, error: cardsError }] = await Promise.all([
    supabaseClient.from("profiles").select("*").eq("id", currentUser.id).single(),
    supabaseClient.from("payment_methods").select("*").eq("user_id", currentUser.id).order("created_at"),
  ]);

  if (profileError) {
    console.error("Failed to load profile:", profileError.message);
    return;
  }

  PROFILE.name = row.full_name || currentUser.email;
  PROFILE.initials = row.full_name ? initialsFromName(row.full_name) : "?";
  PROFILE.loc = row.location || "";
  PROFILE.email = currentUser.email;
  PROFILE.phone = row.phone || "";
  PROFILE.bio = row.bio || "";
  PROFILE.avatarGrad = row.avatar_gradient || null;
  PROFILE.avatarImage = row.avatar_url || null;
  PROFILE.coverImage = row.cover_url || null;
  PROFILE.rating = Number(row.rating) || 0;
  PROFILE.verified = !!row.verified;
  PROFILE.verificationSteps = row.verification_steps || { email: false, phone: false, id: false };
  PROFILE.notificationPrefs = row.notification_prefs || { push: true, email: true, sms: false };
  PROFILE.twoFactorEnabled = !!row.two_factor_enabled;
  PROFILE.payoutMethod = row.payout_method || "";
  PROFILE.memberSince = `Member since ${new Date(row.member_since).getFullYear()}`;

  if (!cardsError && cards) {
    PROFILE.paymentMethods = cards.map((c) => ({ id: c.id, brand: c.brand, last4: c.last4, expiry: c.expiry }));
  }
}

// Persists a partial PROFILE update to Supabase. `partial` uses the same
// front-end field names PROFILE already uses (see PROFILE_TO_COLUMN above);
// paymentMethods and email are handled separately since they don't live on
// the profiles row itself.
async function writeProfileOverrides(partial) {
  if (!currentUser) return;

  const columnUpdate = {};
  for (const [key, value] of Object.entries(partial)) {
    if (key === "initials" || key === "paymentMethods" || key === "email") continue;
    if (key in PROFILE_TO_COLUMN) columnUpdate[PROFILE_TO_COLUMN[key]] = value;
  }

  const tasks = [];

  if (Object.keys(columnUpdate).length) {
    tasks.push(
      supabaseClient
        .from("profiles")
        .update(columnUpdate)
        .eq("id", currentUser.id)
        .then(({ error }) => {
          if (error) console.error("Failed to save profile:", error.message);
        })
    );
  }

  // Email lives on auth.users, not profiles — changing it triggers a
  // confirmation email to the new address before it actually takes effect.
  if (typeof partial.email === "string" && partial.email !== currentUser.email) {
    tasks.push(
      supabaseClient.auth.updateUser({ email: partial.email }).then(({ error }) => {
        if (error) console.error("Failed to update email:", error.message);
      })
    );
  }

  // Payment methods: this UI always hands us the full current list, so the
  // simplest correct sync is delete-all-then-reinsert for this user.
  if (Array.isArray(partial.paymentMethods)) {
    tasks.push(
      (async () => {
        const { error: delError } = await supabaseClient.from("payment_methods").delete().eq("user_id", currentUser.id);
        if (delError) return console.error("Failed to clear payment methods:", delError.message);
        const rows = partial.paymentMethods.map((pm) => ({
          user_id: currentUser.id,
          brand: pm.brand,
          last4: pm.last4,
          expiry: pm.expiry,
        }));
        if (rows.length) {
          const { error: insError } = await supabaseClient.from("payment_methods").insert(rows);
          if (insError) console.error("Failed to save payment methods:", insError.message);
        }
      })()
    );
  }

  await Promise.all(tasks);
}

// Kept as a no-op alias — earlier builds called this to re-apply localStorage
// overrides onto PROFILE; loadProfileFromSupabase() now does that job.
async function applyProfileOverrides() {
  await loadProfileFromSupabase();
}

/* ------------------------------- Image helper ---------------------------------
   Reads a File from an <input type="file">, downsizes it on a canvas so it's
   safe for localStorage (this demo has no backend/object storage), and
   resolves to a compressed JPEG data URL. maxDim keeps avatars small and
   covers a bit larger since they're wider. */
function fileToCompressedDataURL(file, maxDim = 600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) return reject(new Error("Not an image"));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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

// Compresses `file` (see fileToCompressedDataURL above) then uploads it to
// the given public storage bucket ("avatars" | "covers") under this user's
// own folder (required by the storage RLS policies in
// supabase/migrations/0001_auth_and_profiles.sql), returning the public URL.
async function uploadProfileImage(bucket, file, maxDim, quality) {
  const dataUrl = await fileToCompressedDataURL(file, maxDim, quality);
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${currentUser.id}/${bucket === "avatars" ? "avatar" : "cover"}.jpg`;

  const { error: uploadError } = await supabaseClient.storage
    .from(bucket)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  // Cache-bust so the new photo shows immediately instead of a cached old one.
  return `${data.publicUrl}?v=${Date.now()}`;
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
  if (PROFILE.avatarImage) {
    avatarEl.textContent = "";
    avatarEl.style.background = `center / cover no-repeat url("${PROFILE.avatarImage}")`;
  } else {
    avatarEl.textContent = PROFILE.initials;
    avatarEl.style.background = PROFILE.avatarGrad
      ? `linear-gradient(135deg, ${PROFILE.avatarGrad[0]}, ${PROFILE.avatarGrad[1]})`
      : "";
  }

  const coverEl = document.getElementById("profileCover");
  if (coverEl) {
    coverEl.style.backgroundImage = PROFILE.coverImage ? `url("${PROFILE.coverImage}")` : "";
    coverEl.classList.toggle("profile-cover--photo", !!PROFILE.coverImage);
  }

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
// controls instead of a favorite button. Active (published) ads also get a
// Promote button (promote.html) and, once boosted, a Boosted badge — see
// js/promotions-store.js.
function ownedListingCardHTML(item) {
  const isDraft = item.status === "draft";
  const meta = LISTING_STATUS_META[item.status] || LISTING_STATUS_META.published;
  const canPromote = item.status === "published";
  const promoted = canPromote && typeof isPromoted === "function" && isPromoted(item.id);
  return `
    <div class="listing-card" data-listing-id="${item.id}" data-status="${item.status}" role="link" tabindex="0" aria-label="${isDraft ? "Continue editing" : "View"} ${item.title}">
      <div class="listing-media" style="${cardMediaStyle(item)}">
        <span class="status-pill status-pill--${item.status}">${meta.label}</span>
        ${promoted ? `<div class="boosted-badge boosted-badge--corner"><i data-lucide="zap"></i> Boosted</div>` : ""}
        <div class="card-owner-actions">
          <a class="card-owner-btn" href="insights.html?id=${item.id}" aria-label="View insights" title="Insights">
            <i data-lucide="bar-chart-3"></i>
          </a>
          <button type="button" class="card-owner-btn" data-edit-id="${item.id}" aria-label="Edit listing" title="Edit">
            <i data-lucide="pencil"></i>
          </button>
          ${canPromote ? `<a class="card-owner-btn card-owner-btn--promote" href="promote.html?id=${item.id}" aria-label="${promoted ? "Manage boost" : "Promote listing"}" title="${promoted ? "Manage boost" : "Promote"}"><i data-lucide="rocket"></i></a>` : ""}
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

// Same idea as listingCardHTML, but for the user's *own* seeded demo
// listings (MY_LISTING_IDS) — status pill like ownedListingCardHTML, plus a
// Promote button/Boosted badge for active ones, but no edit/delete since
// these aren't backed by a real js/listings-store.js record.
function demoOwnedListingCardHTML(item, status) {
  const meta = LISTING_STATUS_META[status] || LISTING_STATUS_META.published;
  const canPromote = status === "published";
  const promoted = canPromote && typeof isPromoted === "function" && isPromoted(item.id);
  return `
    <div class="listing-card" data-listing-id="${item.id}" data-status="${status}" role="link" tabindex="0" aria-label="View ${item.title}">
      <div class="listing-media" style="background:linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})">
        <span class="status-pill status-pill--${status}">${meta.label}</span>
        ${promoted ? `<div class="boosted-badge boosted-badge--corner"><i data-lucide="zap"></i> Boosted</div>` : ""}
        ${
          canPromote
            ? `<div class="card-owner-actions">
          <a class="card-owner-btn" href="insights.html?id=${item.id}" aria-label="View insights" title="Insights"><i data-lucide="bar-chart-3"></i></a>
          <a class="card-owner-btn card-owner-btn--promote" href="promote.html?id=${item.id}" aria-label="${promoted ? "Manage boost" : "Promote listing"}" title="${promoted ? "Manage boost" : "Promote"}"><i data-lucide="rocket"></i></a>
        </div>`
            : `<div class="card-owner-actions">
          <a class="card-owner-btn" href="insights.html?id=${item.id}" aria-label="View insights" title="Insights"><i data-lucide="bar-chart-3"></i></a>
        </div>`
        }
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
  const demoHTML = demo.map((item) => demoOwnedListingCardHTML(item, status)).join("");
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
    const isCurrency = item.key === "currency";
    const isPersonal = item.key === "personal";
    const isNotifications = item.key === "notifications";
    const isPayment = item.key === "payment";
    const isPrivacy = item.key === "privacy";
    const blockedCount = isBlocked ? getBlockedUsers().length : 0;
    const hint = isVerification
      ? PROFILE.verified
        ? "You're a verified seller"
        : "Verify your email, phone & ID"
      : isBlocked
      ? blockedCount
        ? `${blockedCount} blocked user${blockedCount === 1 ? "" : "s"}`
        : "No blocked users"
      : isCurrency
      ? (() => {
          const code = getSelectedCurrency();
          const info = CURRENCIES[code];
          return info ? `${code} — ${info.name}` : code;
        })()
      : isPersonal
      ? PROFILE.email
      : isNotifications
      ? (() => {
          const on = Object.values(PROFILE.notificationPrefs).filter(Boolean).length;
          return `${on} of 3 alert types on`;
        })()
      : isPayment
      ? `${PROFILE.paymentMethods.length} card${PROFILE.paymentMethods.length === 1 ? "" : "s"} saved`
      : isPrivacy
      ? PROFILE.twoFactorEnabled
        ? "Password · 2FA on"
        : "Password · 2FA off"
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
  state.favs[id] = toggleFavorite(id);
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

// Renders the circular avatar preview inside the modal — a photo if one's
// staged/saved, otherwise the initials-on-gradient look used across the site.
function avatarPreviewHTML(image, grad, initials) {
  const bg = image
    ? `center / cover no-repeat url('${image}')`
    : grad
    ? `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`
    : "";
  return `<div class="modal-avatar-preview" style="background:${bg}">${image ? "" : initials}</div>`;
}

function coverPreviewHTML(image) {
  return `<div class="modal-cover-preview" style="${image ? `background-image:url('${image}')` : ""}"></div>`;
}

function openEditProfileModal() {
  let chosenGrad = PROFILE.avatarGrad;
  let chosenAvatarImage = PROFILE.avatarImage;
  let chosenCoverImage = PROFILE.coverImage;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  function paint() {
    overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h2 class="modal-title">Edit profile</h2>
        <button type="button" class="modal-close" aria-label="Close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <span class="field-label" style="margin-top:0;">Cover photo</span>
        ${coverPreviewHTML(chosenCoverImage)}
        <div class="photo-btn-row">
          <button type="button" class="btn-secondary photo-btn" data-action="pick-cover"><i data-lucide="image-up"></i> ${chosenCoverImage ? "Change cover" : "Upload cover"}</button>
          ${chosenCoverImage ? `<button type="button" class="btn-secondary photo-btn" data-action="remove-cover"><i data-lucide="trash-2"></i> Remove</button>` : ""}
        </div>

        <span class="field-label">Profile photo</span>
        <div class="modal-avatar-row">
          ${avatarPreviewHTML(chosenAvatarImage, chosenGrad, PROFILE.initials)}
          <div class="photo-btn-col">
            <button type="button" class="btn-secondary photo-btn" data-action="pick-avatar"><i data-lucide="image-up"></i> ${chosenAvatarImage ? "Change photo" : "Upload photo"}</button>
            ${chosenAvatarImage ? `<button type="button" class="btn-secondary photo-btn" data-action="remove-avatar"><i data-lucide="trash-2"></i> Remove</button>` : ""}
          </div>
        </div>
        ${
          chosenAvatarImage
            ? ""
            : `<span class="field-label">Avatar color</span>
        <div class="avatar-swatch-row" id="avatarSwatchRow">${avatarSwatchesHTML(chosenGrad)}</div>`
        }

        <label class="field-label" for="editName">Name</label>
        <input class="form-input" id="editName" type="text" maxlength="60" value="${PROFILE.name}" />

        <label class="field-label" for="editLoc">Location</label>
        <input class="form-input" id="editLoc" type="text" maxlength="60" value="${PROFILE.loc}" />

        <label class="field-label" for="editBio">Bio</label>
        <textarea class="field-textarea" id="editBio" maxlength="280">${PROFILE.bio}</textarea>
        <span class="field-char-count" id="editBioCount"></span>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" data-action="cancel">Cancel</button>
        <button type="button" class="btn-primary" data-action="save">Save changes</button>
      </div>
    </div>
    <input type="file" id="modalAvatarInput" accept="image/*" hidden />
    <input type="file" id="modalCoverInput" accept="image/*" hidden />`;
    refreshIcons();

    const bioField = overlay.querySelector("#editBio");
    const bioCount = overlay.querySelector("#editBioCount");
    const updateBioCount = () => (bioCount.textContent = `${bioField.value.length}/280`);
    updateBioCount();
    bioField.addEventListener("input", updateBioCount);

    // Preserve in-progress edits (name/loc/bio) across re-paints triggered by
    // photo changes, so uploading a picture doesn't wipe out typed text.
    if (overlay.dataset.draftName !== undefined) overlay.querySelector("#editName").value = overlay.dataset.draftName;
    if (overlay.dataset.draftLoc !== undefined) overlay.querySelector("#editLoc").value = overlay.dataset.draftLoc;
    if (overlay.dataset.draftBio !== undefined) {
      bioField.value = overlay.dataset.draftBio;
      updateBioCount();
    }
  }

  paint();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("open"));

  function saveDraftFields() {
    overlay.dataset.draftName = overlay.querySelector("#editName").value;
    overlay.dataset.draftLoc = overlay.querySelector("#editLoc").value;
    overlay.dataset.draftBio = overlay.querySelector("#editBio").value;
  }

  function cleanup() {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 200);
  }

  overlay.addEventListener("change", async (e) => {
    if (e.target.id === "modalAvatarInput") {
      const file = e.target.files[0];
      if (!file) return;
      try {
        chosenAvatarImage = await fileToCompressedDataURL(file, 480, 0.85);
        saveDraftFields();
        paint();
      } catch {
        // Unreadable/unsupported file — ignore quietly in this demo.
      }
    }
    if (e.target.id === "modalCoverInput") {
      const file = e.target.files[0];
      if (!file) return;
      try {
        chosenCoverImage = await fileToCompressedDataURL(file, 1200, 0.8);
        saveDraftFields();
        paint();
      } catch {
        // Unreadable/unsupported file — ignore quietly in this demo.
      }
    }
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".modal-close") || e.target.closest('[data-action="cancel"]')) {
      return cleanup();
    }

    if (e.target.closest('[data-action="pick-avatar"]')) return overlay.querySelector("#modalAvatarInput").click();
    if (e.target.closest('[data-action="pick-cover"]')) return overlay.querySelector("#modalCoverInput").click();

    if (e.target.closest('[data-action="remove-avatar"]')) {
      chosenAvatarImage = null;
      saveDraftFields();
      return paint();
    }
    if (e.target.closest('[data-action="remove-cover"]')) {
      chosenCoverImage = null;
      saveDraftFields();
      return paint();
    }

    const swatch = e.target.closest("[data-swatch-index]");
    if (swatch) {
      chosenGrad = GRAD_PALETTE[Number(swatch.dataset.swatchIndex)];
      overlay.querySelectorAll(".avatar-swatch").forEach((el, i) => {
        el.classList.toggle("avatar-swatch--active", i === Number(swatch.dataset.swatchIndex));
      });
      const preview = overlay.querySelector(".modal-avatar-preview");
      if (preview && !chosenAvatarImage) {
        preview.style.background = `linear-gradient(135deg, ${chosenGrad[0]}, ${chosenGrad[1]})`;
      }
      return;
    }

    if (e.target.closest('[data-action="save"]')) {
      const saveBtn = overlay.querySelector('[data-action="save"]');
      saveBtn.disabled = true;

      (async () => {
        const name = overlay.querySelector("#editName").value.trim() || PROFILE.name;
        const loc = overlay.querySelector("#editLoc").value.trim() || PROFILE.loc;
        const bio = overlay.querySelector("#editBio").value.trim();

        // A staged photo is a local data URL until now — upload it to
        // Supabase Storage so what actually gets saved is a real public URL.
        try {
          if (chosenAvatarImage && chosenAvatarImage.startsWith("data:")) {
            const blob = await (await fetch(chosenAvatarImage)).blob();
            const path = `${currentUser.id}/avatar.jpg`;
            await supabaseClient.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: true });
            chosenAvatarImage = `${supabaseClient.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
          }
          if (chosenCoverImage && chosenCoverImage.startsWith("data:")) {
            const blob = await (await fetch(chosenCoverImage)).blob();
            const path = `${currentUser.id}/cover.jpg`;
            await supabaseClient.storage.from("covers").upload(path, blob, { contentType: "image/jpeg", upsert: true });
            chosenCoverImage = `${supabaseClient.storage.from("covers").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
          }
        } catch (err) {
          console.error("Photo upload failed:", err.message || err);
        }

        PROFILE.name = name;
        PROFILE.initials = initialsFromName(name);
        PROFILE.loc = loc;
        PROFILE.bio = bio;
        PROFILE.avatarGrad = chosenGrad;
        PROFILE.avatarImage = chosenAvatarImage;
        PROFILE.coverImage = chosenCoverImage;

        await writeProfileOverrides({
          name,
          loc,
          bio,
          avatarGrad: chosenGrad,
          avatarImage: chosenAvatarImage,
          coverImage: chosenCoverImage,
        });

        renderHeader();
        refreshIcons();
        cleanup();
      })();
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

function openCurrencyModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  function paint() {
    const current = getSelectedCurrency();
    const options = getCurrencyOptions();
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h2 class="modal-title">Currency</h2>
          <button type="button" class="modal-close" aria-label="Close"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p class="modal-note">Prices across Marka display in this currency. We'll also suggest one automatically based on your location, unless you pick your own here.</p>
          <select class="form-select" id="currencySelect">
            ${options.map((o) => `<option value="${o.code}" ${o.code === current ? "selected" : ""}>${o.code} — ${o.name}</option>`).join("")}
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" data-action="close">Cancel</button>
          <button type="button" class="btn-primary" data-action="save">Save</button>
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
    if (e.target.closest('[data-action="save"]')) {
      const select = document.getElementById("currencySelect");
      setSelectedCurrency(select.value);
      renderSettings();
      renderAll();
      refreshIcons();
      return cleanup();
    }
  });
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

/* --------------------------- Personal information modal ------------------------ */
function openPersonalInfoModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h2 class="modal-title">Personal information</h2>
        <button type="button" class="modal-close" aria-label="Close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <label class="field-label" for="piName" style="margin-top:0;">Full name</label>
        <input class="form-input" id="piName" type="text" maxlength="60" value="${PROFILE.name}" />

        <label class="field-label" for="piEmail">Email</label>
        <input class="form-input" id="piEmail" type="email" value="${PROFILE.email}" />
        <p class="field-error" id="piEmailError" hidden>Enter a valid email address.</p>

        <label class="field-label" for="piPhone">Phone number</label>
        <input class="form-input" id="piPhone" type="tel" value="${PROFILE.phone || ""}" />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" data-action="cancel">Cancel</button>
        <button type="button" class="btn-primary" data-action="save">Save changes</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  refreshIcons();
  requestAnimationFrame(() => overlay.classList.add("open"));

  function cleanup() {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 200);
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".modal-close") || e.target.closest('[data-action="cancel"]')) {
      return cleanup();
    }
    if (e.target.closest('[data-action="save"]')) {
      const name = overlay.querySelector("#piName").value.trim() || PROFILE.name;
      const email = overlay.querySelector("#piEmail").value.trim();
      const phone = overlay.querySelector("#piPhone").value.trim();
      const emailError = overlay.querySelector("#piEmailError");

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailError.hidden = false;
        return;
      }
      emailError.hidden = true;

      PROFILE.name = name;
      PROFILE.initials = initialsFromName(name);
      PROFILE.email = email;
      PROFILE.phone = phone;

      writeProfileOverrides({ name, initials: PROFILE.initials, email, phone });

      renderHeader();
      renderSettings();
      refreshIcons();
      cleanup();
    }
  });
}

/* ------------------------------- Notifications modal ---------------------------- */
function openNotificationsModal() {
  let prefs = { ...PROFILE.notificationPrefs };
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const rows = [
    { key: "push", label: "Push notifications", desc: "New messages, offers & listing updates" },
    { key: "email", label: "Email alerts", desc: "Weekly digest and account activity" },
    { key: "sms", label: "SMS alerts", desc: "Time-sensitive buyer/seller texts" },
  ];

  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h2 class="modal-title">Notifications</h2>
        <button type="button" class="modal-close" aria-label="Close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        ${rows
          .map(
            (r) => `
        <div class="toggle-row">
          <div class="toggle-row-text">
            <span class="toggle-row-label">${r.label}</span>
            <span class="toggle-row-desc">${r.desc}</span>
          </div>
          <label class="switch">
            <input type="checkbox" data-pref-key="${r.key}" ${prefs[r.key] ? "checked" : ""} />
            <span class="switch-track"></span>
          </label>
        </div>`
          )
          .join("")}
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" data-action="cancel">Cancel</button>
        <button type="button" class="btn-primary" data-action="save">Save changes</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  refreshIcons();
  requestAnimationFrame(() => overlay.classList.add("open"));

  function cleanup() {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 200);
  }

  overlay.addEventListener("change", (e) => {
    const box = e.target.closest("[data-pref-key]");
    if (box) prefs[box.dataset.prefKey] = box.checked;
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".modal-close") || e.target.closest('[data-action="cancel"]')) {
      return cleanup();
    }
    if (e.target.closest('[data-action="save"]')) {
      PROFILE.notificationPrefs = prefs;
      writeProfileOverrides({ notificationPrefs: prefs });
      renderSettings();
      refreshIcons();
      cleanup();
    }
  });
}

/* ------------------------------ Payment methods modal --------------------------- */
function paymentCardRowHTML(card) {
  return `
    <div class="payment-card-row">
      <span class="payment-card-icon"><i data-lucide="credit-card"></i></span>
      <span class="payment-card-text">
        <span class="payment-card-brand">${card.brand} •••• ${card.last4}</span>
        <span class="payment-card-expiry">Expires ${card.expiry}</span>
      </span>
      <button type="button" class="payment-card-remove" data-remove-card="${card.id}" aria-label="Remove card"><i data-lucide="trash-2"></i></button>
    </div>`;
}

function detectCardBrand(number) {
  if (/^4/.test(number)) return "Visa";
  if (/^5/.test(number)) return "Mastercard";
  if (/^3/.test(number)) return "Amex";
  return "Card";
}

function openPaymentMethodsModal() {
  let cards = PROFILE.paymentMethods.map((c) => ({ ...c }));
  let showAddForm = false;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  function paint() {
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h2 class="modal-title">Payment methods</h2>
          <button type="button" class="modal-close" aria-label="Close"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          ${
            cards.length
              ? cards.map(paymentCardRowHTML).join("")
              : `<p style="margin:0 0 10px; font-size:13px; color:var(--text-tertiary);">No cards saved yet.</p>`
          }
          ${
            showAddForm
              ? `<div class="add-card-form">
                  <input class="form-input" id="pmNumber" inputmode="numeric" maxlength="19" placeholder="Card number" />
                  <div class="add-card-form-row">
                    <input class="form-input" id="pmExpiry" maxlength="5" placeholder="MM/YY" />
                    <input class="form-input" id="pmCvc" maxlength="4" inputmode="numeric" placeholder="CVC" />
                  </div>
                  <p class="field-error" id="pmError" hidden>Enter a valid card number and expiry (MM/YY).</p>
                  <button type="button" class="btn-primary" data-action="confirm-add">Add card</button>
                </div>`
              : `<button type="button" class="btn-secondary photo-btn" style="margin-top:4px; width:100%;" data-action="show-add"><i data-lucide="plus"></i> Add a card</button>`
          }
          <span class="field-label">Payout method</span>
          <div class="payout-row">
            <span class="payout-row-label">Where sold-item payouts land</span>
            <span class="payout-row-value">${PROFILE.payoutMethod}</span>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-primary" data-action="close">Done</button>
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

  function commit() {
    PROFILE.paymentMethods = cards;
    writeProfileOverrides({ paymentMethods: cards });
    renderSettings();
    refreshIcons();
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".modal-close") || e.target.closest('[data-action="close"]')) {
      commit();
      return cleanup();
    }

    const removeBtn = e.target.closest("[data-remove-card]");
    if (removeBtn) {
      cards = cards.filter((c) => c.id !== removeBtn.dataset.removeCard);
      commit();
      return paint();
    }

    if (e.target.closest('[data-action="show-add"]')) {
      showAddForm = true;
      return paint();
    }

    if (e.target.closest('[data-action="confirm-add"]')) {
      const number = overlay.querySelector("#pmNumber").value.replace(/\D/g, "");
      const expiry = overlay.querySelector("#pmExpiry").value.trim();
      const errEl = overlay.querySelector("#pmError");
      const validExpiry = /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry);

      if (number.length < 12 || !validExpiry) {
        errEl.hidden = false;
        return;
      }

      cards.push({
        id: `pm${Date.now()}`,
        brand: detectCardBrand(number),
        last4: number.slice(-4),
        expiry,
      });
      showAddForm = false;
      commit();
      paint();
    }
  });
}

/* ----------------------------- Privacy & security modal -------------------------- */
function openPrivacyModal() {
  let twoFactor = PROFILE.twoFactorEnabled;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  function paint() {
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h2 class="modal-title">Privacy & security</h2>
          <button type="button" class="modal-close" aria-label="Close"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <label class="field-label" for="pwCurrent" style="margin-top:0;">Current password</label>
          <input class="form-input" id="pwCurrent" type="password" autocomplete="current-password" placeholder="••••••••" />

          <label class="field-label" for="pwNew">New password</label>
          <input class="form-input" id="pwNew" type="password" autocomplete="new-password" placeholder="At least 8 characters" />

          <label class="field-label" for="pwConfirm">Confirm new password</label>
          <input class="form-input" id="pwConfirm" type="password" autocomplete="new-password" placeholder="••••••••" />
          <p class="field-error" id="pwError" hidden></p>
          <p class="settings-form-note" id="pwSuccess" hidden>Password updated.</p>

          <div class="toggle-row" style="margin-top:16px;">
            <div class="toggle-row-text">
              <span class="toggle-row-label">Two-factor authentication</span>
              <span class="toggle-row-desc">Require a code at login in addition to your password</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="twoFactorToggle" ${twoFactor ? "checked" : ""} />
              <span class="switch-track"></span>
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" data-action="cancel">Close</button>
          <button type="button" class="btn-primary" data-action="save">Save changes</button>
        </div>
      </div>`;
    refreshIcons();
  }
  paint();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("open"));

  function cleanup() {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 200);
  }

  overlay.addEventListener("change", (e) => {
    if (e.target.id === "twoFactorToggle") twoFactor = e.target.checked;
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".modal-close") || e.target.closest('[data-action="cancel"]')) {
      return cleanup();
    }
    if (e.target.closest('[data-action="save"]')) {
      const current = overlay.querySelector("#pwCurrent").value;
      const next = overlay.querySelector("#pwNew").value;
      const confirm = overlay.querySelector("#pwConfirm").value;
      const errEl = overlay.querySelector("#pwError");
      const successEl = overlay.querySelector("#pwSuccess");

      const wantsPasswordChange = current || next || confirm;
      if (wantsPasswordChange) {
        if (next.length < 8) {
          errEl.textContent = "New password must be at least 8 characters.";
          errEl.hidden = false;
          successEl.hidden = true;
          return;
        }
        if (next !== confirm) {
          errEl.textContent = "New password and confirmation don't match.";
          errEl.hidden = false;
          successEl.hidden = true;
          return;
        }
        errEl.hidden = true;
        successEl.hidden = false;
        overlay.querySelector("#pwCurrent").value = "";
        overlay.querySelector("#pwNew").value = "";
        overlay.querySelector("#pwConfirm").value = "";
      }

      PROFILE.twoFactorEnabled = twoFactor;
      writeProfileOverrides({ twoFactorEnabled: twoFactor });
      renderSettings();
      refreshIcons();

      if (!wantsPasswordChange) cleanup();
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  currentUser = await requireAuth();
  if (!currentUser) return; // requireAuth() already redirected to login.html

  await loadProfileFromSupabase();
  renderAll();

  document.getElementById("editProfileBtn").addEventListener("click", () => {
    openEditProfileModal();
  });

  const avatarFileInput = document.getElementById("avatarFileInput");
  const coverFileInput = document.getElementById("coverFileInput");

  document.getElementById("avatarPhotoBtn").addEventListener("click", () => avatarFileInput.click());
  document.getElementById("coverPhotoBtn").addEventListener("click", () => coverFileInput.click());

  avatarFileInput.addEventListener("change", async () => {
    const file = avatarFileInput.files[0];
    avatarFileInput.value = "";
    if (!file) return;
    try {
      const url = await uploadProfileImage("avatars", file, 480, 0.85);
      PROFILE.avatarImage = url;
      await writeProfileOverrides({ avatarImage: url });
      renderHeader();
      refreshIcons();
    } catch (err) {
      console.error("Avatar upload failed:", err.message || err);
    }
  });

  coverFileInput.addEventListener("change", async () => {
    const file = coverFileInput.files[0];
    coverFileInput.value = "";
    if (!file) return;
    try {
      const url = await uploadProfileImage("covers", file, 1200, 0.8);
      PROFILE.coverImage = url;
      await writeProfileOverrides({ coverImage: url });
      renderHeader();
      refreshIcons();
    } catch (err) {
      console.error("Cover upload failed:", err.message || err);
    }
  });

  window.addEventListener(BLOCKED_USERS_UPDATED_EVENT, () => {
    renderSettings();
    refreshIcons();
  });

  window.addEventListener(PROMOTIONS_UPDATED_EVENT, () => {
    renderMyListings();
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

    const currencySettingsBtn = e.target.closest('[data-settings-key="currency"]');
    if (currencySettingsBtn) {
      openCurrencyModal();
      return;
    }

    const personalSettingsBtn = e.target.closest('[data-settings-key="personal"]');
    if (personalSettingsBtn) {
      openPersonalInfoModal();
      return;
    }

    const notificationsSettingsBtn = e.target.closest('[data-settings-key="notifications"]');
    if (notificationsSettingsBtn) {
      openNotificationsModal();
      return;
    }

    const paymentSettingsBtn = e.target.closest('[data-settings-key="payment"]');
    if (paymentSettingsBtn) {
      openPaymentMethodsModal();
      return;
    }

    const privacySettingsBtn = e.target.closest('[data-settings-key="privacy"]');
    if (privacySettingsBtn) {
      openPrivacyModal();
      return;
    }

    const helpSettingsBtn = e.target.closest('[data-settings-key="help"]');
    if (helpSettingsBtn) {
      window.location.href = "contact.html";
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

    if (e.target.closest(".card-owner-actions a[href]")) return;

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
      MarkaAuth.signOut().finally(() => {
        window.location.href = "login.html";
      });
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
