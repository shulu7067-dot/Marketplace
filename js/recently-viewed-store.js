/* ============================================================================
   MARKA — Recently viewed store
   Tracks the listings a visitor actually opens (js/listing.js calls
   recordListingView() on load) so browse.html's "Recently viewed" row
   reflects real browsing instead of a fixed demo list. Persisted to
   localStorage — same pattern as js/saved-searches-store.js. Falls back to
   RECENTLY_VIEWED_IDS (js/browse-data.js's seed list) until there's at least
   one real view, so the row isn't empty the first time someone opens the site.
   ============================================================================ */

const RECENTLY_VIEWED_KEY = "marka_recently_viewed_v1";
const RECENTLY_VIEWED_MAX = 8;

function readRecentlyViewedIds() {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeRecentlyViewedIds(ids) {
  try {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(ids));
  } catch {
    // Storage full/unavailable — this is a local-only demo store, fail quietly.
  }
}

// Only numeric LISTING_DETAILS ids are tracked — a seller's own draft/live
// listings (string "u_..." ids from js/listings-store.js) aren't part of the
// recently-viewed rail. Most-recent-first, deduped, capped at
// RECENTLY_VIEWED_MAX.
function recordListingView(id) {
  const numId = Number(id);
  if (!Number.isFinite(numId)) return;
  const ids = readRecentlyViewedIds().filter((existing) => existing !== numId);
  ids.unshift(numId);
  writeRecentlyViewedIds(ids.slice(0, RECENTLY_VIEWED_MAX));
}

function getRecentlyViewedIds() {
  const tracked = readRecentlyViewedIds();
  return tracked.length ? tracked : RECENTLY_VIEWED_IDS;
}
