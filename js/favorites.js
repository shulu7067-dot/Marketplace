/* ============================================================================
   MARKA — Favorites page logic
   Reads every id out of js/favorites-store.js and resolves each one to a full
   listing record — LISTING_DETAILS (js/listing-data.js) for demo/catalog ids,
   or a user-posted ad (js/listings-store.js) for "u_..." ids — then renders
   them through the same .listing-card markup browse.html/profile.html use.
   Shares NAV_LINKS / BOTTOM_NAV / priceStub() / favButtonHTML() /
   cardMediaStyle() / confirmModal() / refreshIcons() with the rest of the
   site via js/common.js.
   ============================================================================ */

const FAV_SORT_OPTIONS = [
  { value: "recent", label: "Recently saved" },
  { value: "price-low", label: "Lowest Price" },
  { value: "price-high", label: "Highest Price" },
  { value: "title", label: "Title A–Z" },
];

const state = { sortBy: "recent" };

function favParsePrice(str) {
  return Number(String(str).replace(/[^0-9.]/g, "")) || 0;
}

// Resolves a stored favorite id to a full listing record, or null if it no
// longer exists (e.g. a user-posted ad that was since deleted).
function resolveFavoriteRecord(id) {
  const demo = LISTING_DETAILS[id];
  if (demo) return demo;
  const owned = typeof getUserListing === "function" ? getUserListing(id) : null;
  return owned ? userListingToRecord(owned) : null;
}

function getFavoriteRecords() {
  return getFavoriteIds()
    .map(resolveFavoriteRecord)
    .filter((r) => r && !isUserBlocked(r.seller && r.seller.name));
}

function getSortedFavorites(records) {
  const sorted = records.slice();
  switch (state.sortBy) {
    case "price-low":
      return sorted.sort((a, b) => favParsePrice(a.price) - favParsePrice(b.price));
    case "price-high":
      return sorted.sort((a, b) => favParsePrice(b.price) - favParsePrice(a.price));
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return sorted; // already newest-saved-first, matching favorites-store's unshift order
  }
}

/* --------------------------------- Renderers ---------------------------------- */
function renderSortOptions() {
  const select = document.getElementById("favSort");
  select.innerHTML = FAV_SORT_OPTIONS.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
  select.value = state.sortBy;
}

function favCardHTML(item) {
  return `
    <div class="listing-card" data-listing-id="${item.id}" role="link" tabindex="0" aria-label="View ${item.title}">
      <div class="listing-media" style="${cardMediaStyle(item)}">
        ${item.seller && item.seller.verified ? `<span class="condition-badge card-badge"><i data-lucide="badge-check"></i>Verified</span>` : ""}
        ${favButtonHTML(item.id, true)}
      </div>
      <div class="listing-body">
        <div class="card-title truncate">${item.title}</div>
        <div class="card-loc"><i data-lucide="map-pin"></i><span>${item.loc}</span></div>
        <div class="card-footer">
          ${priceStub(item.price)}
          <span class="card-time">${item.condition || ""}</span>
        </div>
      </div>
    </div>`;
}

function renderAll() {
  renderNavLinks("");
  renderSortOptions();

  const records = getSortedFavorites(getFavoriteRecords());
  const grid = document.getElementById("favGrid");
  const empty = document.getElementById("favEmpty");
  const clearBtn = document.getElementById("favClearAllBtn");
  const count = document.getElementById("favCount");

  count.textContent = records.length ? `${records.length} saved item${records.length === 1 ? "" : "s"}` : "";
  clearBtn.hidden = records.length === 0;

  if (!records.length) {
    grid.hidden = true;
    grid.innerHTML = "";
    empty.hidden = false;
    refreshIcons();
    return;
  }

  empty.hidden = true;
  grid.hidden = false;
  grid.innerHTML = records.map(favCardHTML).join("");
  refreshIcons();
}

/* --------------------------------- Events ------------------------------------- */
function goToListing(id) {
  window.location.href = `listing.html?id=${id}`;
}

async function handleClearAll() {
  const confirmed = await confirmModal({
    title: "Clear all favorites?",
    message: "This removes every saved listing from your favorites. You can always favorite them again later.",
    confirmLabel: "Clear all",
    danger: true,
  });
  if (!confirmed) return;
  getFavoriteIds().forEach((id) => removeFavorite(id));
  renderAll();
}

document.addEventListener("click", (e) => {
  const favBtn = e.target.closest("[data-fav-id]");
  if (favBtn) {
    removeFavorite(favBtn.dataset.favId);
    renderAll();
    return;
  }

  if (e.target.closest("#favClearAllBtn")) {
    handleClearAll();
    return;
  }

  const tabBtn = e.target.closest("[data-tab]");
  if (tabBtn) {
    renderBottomNav(tabBtn.dataset.tab);
    refreshIcons();
    return;
  }

  const card = e.target.closest(".listing-card[data-listing-id]");
  if (card) {
    goToListing(card.dataset.listingId);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const card = e.target.closest(".listing-card[data-listing-id]");
  if (!card) return;
  e.preventDefault();
  goToListing(card.dataset.listingId);
});

document.getElementById("favSort").addEventListener("change", (e) => {
  state.sortBy = e.target.value;
  renderAll();
});

window.addEventListener(FAVORITES_UPDATED_EVENT, renderAll);
window.addEventListener(BLOCKED_USERS_UPDATED_EVENT, renderAll);

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  renderBottomNav("favorites");
  refreshIcons();
});
