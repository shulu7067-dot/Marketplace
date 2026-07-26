/* ============================================================================
   MARKA — Saved searches store
   Lets a signed-in user save the current Browse page filters (js/browse.js
   `state`) and revisit them later from the profile page's Saved > Saved
   searches tab. Persisted to localStorage since this build has no backend,
   mirroring the pattern in js/listings-store.js. Seeded with two demo
   searches on first load so the tab isn't empty before anyone's saved one.
   ============================================================================ */

const SAVED_SEARCHES_KEY = "marka_saved_searches_v1";
const SAVED_SEARCHES_SEEDED_KEY = "marka_saved_searches_seeded_v1";

const SAVED_SEARCHES_SEED = [
  {
    id: "s_seed_1",
    query: "trek marlin",
    category: "Bikes",
    minPrice: null,
    maxPrice: 500,
    condition: "Any condition",
    location: "All locations",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "s_seed_2",
    query: "",
    category: "Electronics",
    minPrice: null,
    maxPrice: null,
    condition: "Like new",
    location: "Riverside, NY",
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
  },
];

function newSavedSearchId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* -------------------------------- Read / write -------------------------------- */
function readSavedSearches() {
  try {
    if (!localStorage.getItem(SAVED_SEARCHES_SEEDED_KEY)) {
      localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(SAVED_SEARCHES_SEED));
      localStorage.setItem(SAVED_SEARCHES_SEEDED_KEY, "1");
    }
    const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeSavedSearches(list) {
  try {
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(list));
  } catch {
    // Storage full/unavailable — this is a local-only demo store, fail quietly.
  }
}

// `filters` is the shape of browse.js's `state`: { query, category, minPrice,
// maxPrice, condition, origin, radiusKm, ... }. Only the search-defining
// fields are kept — sortBy/page aren't part of what makes a search worth
// re-running. `location` stays a plain human-readable label (used by
// savedSearchSummary below) but is now derived from a real searched place or
// GPS fix — never a hardcoded province/city — via origin.lat/origin.lng.
function saveSearch(filters) {
  const list = readSavedSearches();
  const origin = filters.origin || null;
  const record = {
    id: newSavedSearchId(),
    query: (filters.query || "").trim(),
    category: filters.category || "All categories",
    minPrice: filters.minPrice ?? null,
    maxPrice: filters.maxPrice ?? null,
    condition: filters.condition || "Any condition",
    location: origin ? `Within ${filters.radiusKm ?? 25} km of ${origin.label}` : "All locations",
    originLat: origin ? origin.lat : null,
    originLng: origin ? origin.lng : null,
    originLabel: origin ? origin.label : null,
    radiusKm: origin ? filters.radiusKm ?? 25 : null,
    createdAt: new Date().toISOString(),
  };
  list.unshift(record);
  writeSavedSearches(list);
  return record;
}

function deleteSavedSearch(id) {
  writeSavedSearches(readSavedSearches().filter((s) => s.id !== id));
}

/* ------------------------------- Render helpers -------------------------------- */
// Human-readable summary of everything a saved search filters on, e.g.
// "Bikes • Under $500" — used as the card subtitle on the profile page.
function savedSearchSummary(s) {
  const parts = [];
  if (s.category && s.category !== "All categories") parts.push(s.category);
  if (s.minPrice != null && s.maxPrice != null) parts.push(`${formatPrice(s.minPrice)} – ${formatPrice(s.maxPrice)}`);
  else if (s.minPrice != null) parts.push(`From ${formatPrice(s.minPrice)}`);
  else if (s.maxPrice != null) parts.push(`Under ${formatPrice(s.maxPrice)}`);
  if (s.condition && s.condition !== "Any condition") parts.push(s.condition);
  if (s.location && s.location !== "All locations") parts.push(s.location);
  return parts.length ? parts.join(" • ") : "All listings";
}

function savedSearchTitle(s) {
  return s.query ? `"${s.query}"` : savedSearchSummary(s);
}

// Rebuilds the browse.html URL that reproduces this saved search's filters
// (js/browse.js reads all of these params back out on load).
function savedSearchURL(s) {
  const params = new URLSearchParams();
  if (s.query) params.set("q", s.query);
  if (s.category && s.category !== "All categories") params.set("category", s.category);
  if (s.minPrice != null) params.set("min", s.minPrice);
  if (s.maxPrice != null) params.set("max", s.maxPrice);
  if (s.condition && s.condition !== "Any condition") params.set("condition", s.condition);
  if (s.originLat != null && s.originLng != null) {
    params.set("lat", s.originLat);
    params.set("lng", s.originLng);
    params.set("radius", s.radiusKm ?? 25);
    if (s.originLabel) params.set("loc", s.originLabel);
  }
  return `browse.html${params.toString() ? `?${params.toString()}` : ""}`;
}
