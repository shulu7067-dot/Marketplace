/* ============================================================================
   MARKA — Favorites store
   The heart button on every card (home, browse, category, listing, similar-
   listings, profile) reads/writes this one store, so favoriting something on
   any page is reflected everywhere else and survives a reload — same
   localStorage pattern as js/blocked-users-store.js and
   js/recently-viewed-store.js. favorites.html is the dedicated page that
   lists everything saved here.

   Ids can be numeric (js/listing-data.js LISTING_DETAILS) or string "u_..."
   ids (a signed-in user's own posted ads, js/listings-store.js) — this store
   doesn't care which, it just remembers whatever id it was given.
   ============================================================================ */

const FAVORITES_KEY = "marka_favorites_v1";
const FAVORITES_UPDATED_EVENT = "marka:favorites-updated";

// Seeds the very first load so the page/badge isn't empty before anyone has
// favorited anything in this browser — mirrors js/profile-data.js's
// MY_FAVORITE_IDS. Once the user favorites/unfavorites anything, the real
// stored list (which may be empty) takes over for good.
const DEFAULT_FAVORITE_IDS = [1, 104, 106];

function notifyFavoritesUpdated() {
  window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT));
}

/* --------------------------------- Read / write -------------------------------- */
function readStoredFavoriteIds() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeFavoriteIds(ids) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    // Storage full/unavailable — this is a local-only demo store, fail quietly.
  }
}

/* --------------------------------- Public API ----------------------------------- */
function getFavoriteIds() {
  const stored = readStoredFavoriteIds();
  return stored !== null ? stored : DEFAULT_FAVORITE_IDS.slice();
}

function getFavoriteCount() {
  return getFavoriteIds().length;
}

function isFavorited(id) {
  const key = String(id);
  return getFavoriteIds().some((f) => String(f) === key);
}

// Adds/removes `id` and returns the new favorited state (true = now saved).
function toggleFavorite(id) {
  const ids = getFavoriteIds();
  const key = String(id);
  const idx = ids.findIndex((f) => String(f) === key);
  let nowFavorited;
  if (idx >= 0) {
    ids.splice(idx, 1);
    nowFavorited = false;
  } else {
    ids.unshift(id);
    nowFavorited = true;
  }
  writeFavoriteIds(ids);
  notifyFavoritesUpdated();
  if (nowFavorited && typeof recordListingEvent === "function") recordListingEvent(id, "favorite");
  return nowFavorited;
}

function removeFavorite(id) {
  const key = String(id);
  writeFavoriteIds(getFavoriteIds().filter((f) => String(f) !== key));
  notifyFavoritesUpdated();
}
