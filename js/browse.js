/* ============================================================================
   MARKA — Browse page logic
   Search-results / category-browsing experience between the home page and
   the listing page. Shares NAV_LINKS / BOTTOM_NAV / priceStub() /
   favButtonHTML() / refreshIcons() with the rest of the site via js/common.js,
   and its dataset with js/browse-data.js.

   Location works from a real, worldwide search (Nominatim) or the device's
   GPS — there is no fixed list of provinces/cities to choose from. Category
   and Location each open a full-screen sheet (like Facebook Marketplace's
   pickers) that covers the whole page while it's open.
   ============================================================================ */

const PER_PAGE = 4;
const DEFAULT_RADIUS_KM = 25;

function getRequestedCategory() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");
  return BROWSE_CATEGORY_OPTIONS.includes(category) ? category : "All categories";
}

// e.g. index.html's hero search -> browse.html?q=trek+marlin pre-fills the
// search box and results the same way typing it in directly would.
function getRequestedQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("q") || "";
}

// A saved search (js/saved-searches-store.js) links back here with the rest
// of its filters in the URL too, so reopening one reproduces it exactly
// instead of just the query/category.
function getRequestedNumber(key) {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(key);
  const num = raw === null ? NaN : Number(raw);
  return Number.isFinite(num) ? num : null;
}

function getRequestedOption(key, options, fallback) {
  const params = new URLSearchParams(window.location.search);
  const val = params.get(key);
  return val && options.includes(val) ? val : fallback;
}

// A saved/shared search can carry a real lat/lng/radius/label in the URL
// (see js/saved-searches-store.js's savedSearchURL) — restore that as the
// starting origin instead of forcing a fresh location search.
function getRequestedOrigin() {
  const params = new URLSearchParams(window.location.search);
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, label: params.get("loc") || "Saved location", isMe: false };
}

const state = {
  query: getRequestedQuery(),
  category: getRequestedCategory(), // e.g. browse.html?category=Electronics -> "Home > Electronics"
  minPrice: getRequestedNumber("min"),
  maxPrice: getRequestedNumber("max"),
  condition: getRequestedOption("condition", BROWSE_CONDITION_OPTIONS, "Any condition"),
  origin: getRequestedOrigin(), // { lat, lng, label, isMe } | null — "All locations" when null
  radiusKm: getRequestedNumber("radius") || DEFAULT_RADIUS_KM,
  sortBy: "newest",
  view: "grid", // "grid" | "map"
  page: 1,
  favs: Object.fromEntries(getFavoriteIds().map((id) => [id, true])),
};

// Sheet-local draft state — only committed to `state` when "Apply" is
// pressed, so opening the Location sheet and backing out with the close
// button (or a click outside it) doesn't change anything.
let pendingOrigin = state.origin;
let pendingRadiusKm = state.radiusKm;

let browseMap = null;
let browseMapMarkers = [];
let geocodeDebounce = null;
let geocodeRequestId = 0;

/* --------------------------------- Helpers ------------------------------------ */
// Attaches a live distanceKm (and formatted label) to every listing once a
// location origin (GPS or a searched place) is set — used by both the sort
// and the card badges/map.
function withDistances(list) {
  if (!state.origin) return list;
  return list.map((l) => {
    const distanceKm = l.lat !== null && l.lng !== null ? haversineDistanceKm(state.origin.lat, state.origin.lng, l.lat, l.lng) : null;
    return { ...l, distanceKm };
  });
}

function getFilteredListings() {
  const q = state.query.trim().toLowerCase();
  let list = BROWSE_LISTINGS.filter((l) => {
    if (q && !l.title.toLowerCase().includes(q)) return false;
    if (state.category !== "All categories" && l.tag !== state.category) return false;
    if (state.minPrice !== null && l.priceValue < state.minPrice) return false;
    if (state.maxPrice !== null && l.priceValue > state.maxPrice) return false;
    if (state.condition !== "Any condition" && l.condition !== state.condition) return false;
    if (isUserBlocked(l.sellerName)) return false;
    return true;
  });

  list = withDistances(list);

  if (state.origin) {
    list = list.filter((l) => l.distanceKm === null || l.distanceKm <= state.radiusKm);
  }

  return list;
}

function getSortedListings(list) {
  const arr = [...list];
  if (state.sortBy === "price-low") arr.sort((a, b) => a.priceValue - b.priceValue);
  else if (state.sortBy === "price-high") arr.sort((a, b) => b.priceValue - a.priceValue);
  else if (state.sortBy === "popular") arr.sort((a, b) => b.popularity - a.popularity);
  else if (state.sortBy === "distance") arr.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  else arr.sort((a, b) => a.hoursAgo - b.hoursAgo); // newest
  return arr;
}

function resetFilters() {
  state.query = "";
  state.category = "All categories";
  state.minPrice = null;
  state.maxPrice = null;
  state.condition = "Any condition";
  state.origin = null;
  state.radiusKm = DEFAULT_RADIUS_KM;
  state.page = 1;
  pendingOrigin = null;
  pendingRadiusKm = DEFAULT_RADIUS_KM;
  document.getElementById("browseSearch").value = "";
  document.getElementById("filterPriceMin").value = "";
  document.getElementById("filterPriceMax").value = "";
  document.getElementById("filterCondition").value = "Any condition";
  document.getElementById("locationSearchInput").value = "";
  document.getElementById("locationStatus").textContent = "";
  document.getElementById("locationStatus").classList.remove("is-error", "is-active");
  renderAll();
}

/* --------------------------------- Renderers ---------------------------------- */
function renderBreadcrumb() {
  const el = document.getElementById("breadcrumb");
  const current = state.category === "All categories" ? "All listings" : state.category;
  el.innerHTML = `
    <a href="index.html">Home</a>
    <i data-lucide="chevron-right"></i>
    <span aria-current="page">${current}</span>`;
}

function locationPillLabel() {
  if (!state.origin) return "All locations";
  const short = state.origin.label.split(",")[0].trim() || state.origin.label;
  return `${state.origin.isMe ? "Near " : ""}${short} · ${state.radiusKm} km`;
}

function renderFilterOptions() {
  document.getElementById("categoryFilterLabel").textContent = state.category === "All categories" ? "All categories" : state.category;
  document.getElementById("openCategoriesBtn").classList.toggle("active", state.category !== "All categories");

  document.getElementById("locationFilterLabel").textContent = locationPillLabel();
  document.getElementById("openLocationBtn").classList.toggle("active", !!state.origin);

  const condSel = document.getElementById("filterCondition");
  condSel.innerHTML = BROWSE_CONDITION_OPTIONS.map((c) => `<option value="${c}">${c}</option>`).join("");
  condSel.value = state.condition;

  document.getElementById("filterPriceMin").value = state.minPrice ?? "";
  document.getElementById("filterPriceMax").value = state.maxPrice ?? "";

  const sortOptions = BROWSE_SORT_OPTIONS.slice();
  if (state.origin) sortOptions.push({ value: "distance", label: "Nearest to me" });
  else if (state.sortBy === "distance") state.sortBy = "newest";
  const sortSel = document.getElementById("resultsSort");
  sortSel.innerHTML = sortOptions.map((s) => `<option value="${s.value}">${s.label}</option>`).join("");
  sortSel.value = state.sortBy;
}

function renderChips() {
  const row = document.getElementById("filterChips");
  const chips = [];

  if (state.category !== "All categories") chips.push({ key: "category", label: state.category });
  if (state.minPrice !== null && state.maxPrice !== null) chips.push({ key: "price", label: `${formatPrice(state.minPrice)} – ${formatPrice(state.maxPrice)}` });
  else if (state.minPrice !== null) chips.push({ key: "price", label: `From ${formatPrice(state.minPrice)}` });
  else if (state.maxPrice !== null) chips.push({ key: "price", label: `Under ${formatPrice(state.maxPrice)}` });
  if (state.condition !== "Any condition") chips.push({ key: "condition", label: state.condition });
  if (state.origin) chips.push({ key: "origin", label: locationPillLabel() });
  if (state.query.trim()) chips.push({ key: "query", label: `"${state.query.trim()}"` });

  if (!chips.length) {
    row.innerHTML = "";
    row.hidden = true;
    return;
  }

  row.hidden = false;
  row.innerHTML =
    chips
      .map(
        (c) => `
      <span class="filter-chip">
        ${c.label}
        <button type="button" data-chip-remove="${c.key}" aria-label="Remove filter: ${c.label}">
          <i data-lucide="x"></i>
        </button>
      </span>`
      )
      .join("") +
    `<button type="button" class="chip-clear-all" id="chipClearAll">Clear all</button>`;
}

function renderResultsHeader(count) {
  document.getElementById("resultsCount").innerHTML = `<strong>${count.toLocaleString()}</strong> Result${count === 1 ? "" : "s"}`;
}

function renderGrid(pageItems) {
  const grid = document.getElementById("browseGrid");
  const empty = document.getElementById("emptyState");

  if (!pageItems.length) {
    grid.hidden = true;
    grid.innerHTML = "";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  grid.hidden = false;
  grid.innerHTML = pageItems
    .map(
      (item) => `
    <div class="listing-card" data-listing-id="${item.id}" role="link" tabindex="0" aria-label="View ${item.title}">
      <div class="listing-media" style="background:linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})">
        ${item.verified ? `<span class="condition-badge card-badge"><i data-lucide="badge-check"></i>Verified</span>` : ""}
        ${favButtonHTML(item.id, !!state.favs[item.id])}
      </div>
      <div class="listing-body">
        <div class="card-title truncate">${item.title}</div>
        <div class="card-loc"><i data-lucide="map-pin"></i><span>${item.loc}</span></div>
        ${state.origin && item.distanceKm !== null ? `<div class="card-distance"><i data-lucide="navigation"></i>${formatDistance(item.distanceKm)}</div>` : ""}
        <div class="card-footer">
          ${priceStub(item.price)}
          <span class="card-time">${formatShortAgo(item.hoursAgo)} ago</span>
        </div>
      </div>
    </div>`
    )
    .join("");
}

function renderPagination(totalPages) {
  const el = document.getElementById("pagination");
  if (totalPages <= 1) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;

  const pageBtns = Array.from({ length: totalPages }, (_, i) => i + 1)
    .map(
      (p) => `
      <button type="button" class="page-btn ${p === state.page ? "active" : ""}" data-page="${p}" aria-label="Go to page ${p}" aria-current="${p === state.page ? "page" : "false"}">${p}</button>`
    )
    .join("");

  el.innerHTML = `
    <button type="button" class="page-btn page-btn--nav" data-page-nav="prev" ${state.page === 1 ? "disabled" : ""} aria-label="Previous page">
      <i data-lucide="chevron-left"></i> Previous
    </button>
    <div class="page-numbers">${pageBtns}</div>
    <button type="button" class="page-btn page-btn--nav" data-page-nav="next" ${state.page === totalPages ? "disabled" : ""} aria-label="Next page">
      Next <i data-lucide="chevron-right"></i>
    </button>`;
}

function renderRecentlyViewed() {
  const row = document.getElementById("recentRow");
  const section = document.getElementById("recentSection");
  const items = getRecentlyViewedIds()
    .map((id) => BROWSE_LISTINGS.find((l) => l.id === id))
    .filter((l) => l && !isUserBlocked(l.sellerName));

  if (section) section.hidden = items.length === 0;
  if (!items.length) {
    row.innerHTML = "";
    return;
  }

  row.innerHTML = items
    .map(
      (item) => `
    <div class="listing-card" data-listing-id="${item.id}" role="link" tabindex="0" aria-label="View ${item.title}">
      <div class="listing-media" style="background:linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})">
        ${favButtonHTML(item.id, !!state.favs[item.id])}
      </div>
      <div class="listing-body">
        <div class="card-title truncate">${item.title}</div>
        <div class="card-loc"><i data-lucide="map-pin"></i><span>${item.loc}</span></div>
        <div class="card-footer">
          ${priceStub(item.price)}
          <span class="card-time">${formatShortAgo(item.hoursAgo)} ago</span>
        </div>
      </div>
    </div>`
    )
    .join("");
}

function renderAll() {
  renderNavLinks("");
  renderBreadcrumb();
  renderFilterOptions();
  renderChips();

  const filtered = getSortedListings(getFilteredListings());
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  state.page = Math.min(state.page, totalPages);
  const pageItems = filtered.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);

  renderResultsHeader(filtered.length);

  if (state.view === "map") {
    renderMapView(filtered);
  } else {
    renderGrid(pageItems);
    renderPagination(totalPages);
  }
  refreshIcons();
}

/* ----------------------------------- Map view ----------------------------------- */
function setView(view) {
  state.view = view;
  document.getElementById("gridViewBtn").classList.toggle("active", view === "grid");
  document.getElementById("gridViewBtn").setAttribute("aria-pressed", String(view === "grid"));
  document.getElementById("mapViewBtn").classList.toggle("active", view === "map");
  document.getElementById("mapViewBtn").setAttribute("aria-pressed", String(view === "map"));
  document.getElementById("browseGrid").hidden = view !== "grid";
  document.getElementById("pagination").hidden = view !== "grid";
  document.getElementById("mapView").hidden = view !== "map";
  document.getElementById("emptyState").hidden = true;
  renderAll();
}

function ensureBrowseMap() {
  if (browseMap || typeof L === "undefined") return browseMap;
  browseMap = L.map("browseMap", { scrollWheelZoom: false }).setView([40.73, -74.0], 9);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(browseMap);
  return browseMap;
}

function markerIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="marka-pin"><span>&bull;</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

function renderMapView(list) {
  if (typeof L === "undefined") {
    document.getElementById("browseMap").innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-tertiary)">Map couldn't load — check your connection.</div>`;
    return;
  }
  const map = ensureBrowseMap();
  if (!map) return;

  browseMapMarkers.forEach((m) => map.removeLayer(m));
  browseMapMarkers = [];

  const withCoords = list.filter((l) => l.lat !== null && l.lng !== null);

  withCoords.forEach((item) => {
    const marker = L.marker([item.lat, item.lng], { icon: markerIcon() }).addTo(map);
    const distanceLabel = state.origin && item.distanceKm !== null ? `<div class="map-popup-loc">${formatDistance(item.distanceKm)}</div>` : "";
    marker.bindPopup(`
      <div class="map-popup">
        <div class="map-popup-media" style="background:linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})"></div>
        <div class="map-popup-title">${item.title}</div>
        ${priceStub(item.price)}
        <div class="map-popup-loc">${item.loc}</div>
        ${distanceLabel}
        <a class="map-popup-link" href="listing.html?id=${item.id}">View listing</a>
      </div>
    `);
    browseMapMarkers.push(marker);
  });

  setTimeout(() => map.invalidateSize(), 50);

  if (withCoords.length) {
    const bounds = L.latLngBounds(withCoords.map((l) => [l.lat, l.lng]));
    if (state.origin) bounds.extend([state.origin.lat, state.origin.lng]);
    map.fitBounds(bounds.pad(0.25), { maxZoom: 13 });
  }

  if (state.origin) {
    L.circleMarker([state.origin.lat, state.origin.lng], {
      radius: 7,
      color: "#2F5D62",
      fillColor: "#2F5D62",
      fillOpacity: 0.9,
      weight: 2,
    })
      .addTo(map)
      .bindPopup(state.origin.isMe ? "You are here" : "Search center");
  }
}

/* --------------------------------- Sheets (full-screen) ------------------------------- */
// Shared open/close for the three full-screen pickers below — each covers the
// whole page while open, same idea as Facebook Marketplace's category/location
// pickers, so the person can focus on just that choice.
function openSheet(id) {
  const overlay = document.getElementById(id);
  overlay.hidden = false;
  document.body.classList.add("sheet-open");
  requestAnimationFrame(() => overlay.classList.add("open"));
}

function closeSheet(id) {
  const overlay = document.getElementById(id);
  overlay.classList.remove("open");
  document.body.classList.remove("sheet-open");
  setTimeout(() => {
    overlay.hidden = true;
  }, 280);
}

function wireSheetDismiss(id, onClose) {
  const overlay = document.getElementById(id);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeSheet(id);
      if (onClose) onClose();
    }
  });
}

/* ------------------------------- Categories sheet -------------------------------- */
function renderCategoryTiles() {
  const grid = document.getElementById("catTileGrid");
  const tiles = [
    { slug: "", label: "All categories", icon: "grid-3x3", color: "#16213E", bg: "#E7EAF2" },
    ...CATEGORY_DETAILS.map((c) => ({ slug: c.slug, label: c.label, icon: c.icon, color: c.color, bg: c.bg })),
  ];
  grid.innerHTML = tiles
    .map((t) => {
      const active = state.category === t.label || (t.label === "All categories" && state.category === "All categories");
      const count = t.label === "All categories" ? BROWSE_LISTINGS.length : getCategoryListingCount(t.label);
      return `
      <button type="button" class="cat-tile ${active ? "active" : ""}" data-category="${t.label}">
        <span class="cat-tile-icon" style="background:${t.bg}"><i data-lucide="${t.icon}" style="color:${t.color}"></i></span>
        <span class="cat-tile-label">${t.label}</span>
        <span class="cat-tile-count">${count}</span>
      </button>`;
    })
    .join("");
  refreshIcons();
}

/* -------------------------------- Location sheet ---------------------------------- */
function updateRadiusLabel() {
  document.getElementById("radiusValueLabel").textContent = `${pendingRadiusKm} km`;
}

function setLocationStatus(text, kind) {
  const el = document.getElementById("locationStatus");
  el.textContent = text;
  el.classList.remove("is-error", "is-active");
  if (kind) el.classList.add(kind);
}

function renderLocationSuggestions(results) {
  const box = document.getElementById("locationSuggestions");
  if (!results.length) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  box.hidden = false;
  box.innerHTML = results
    .map(
      (r, i) => `
    <button type="button" class="location-suggestion" data-suggestion-index="${i}">
      <i data-lucide="map-pin"></i><span>${r.label}</span>
    </button>`
    )
    .join("");
  refreshIcons();
}

// Free-text worldwide place search via OpenStreetMap's Nominatim — anyone can
// type any town, city, neighbourhood or postcode on Earth, not just a fixed
// list of seeded cities.
async function geocodeSearch(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&addressdetails=1&limit=6`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((d) => ({ label: d.display_name, lat: Number(d.lat), lng: Number(d.lng ?? d.lon) }));
  } catch {
    return [];
  }
}

let lastGeocodeResults = [];

function openLocationSheet() {
  pendingOrigin = state.origin;
  pendingRadiusKm = state.radiusKm;
  document.getElementById("locationSearchInput").value = state.origin && !state.origin.isMe ? state.origin.label : "";
  document.getElementById("radiusSlider").value = pendingRadiusKm;
  updateRadiusLabel();
  renderLocationSuggestions([]);
  if (state.origin) {
    setLocationStatus(state.origin.isMe ? `Using your current location` : `Set to ${state.origin.label}`, "is-active");
  } else {
    setLocationStatus("");
  }
  openSheet("locationSheet");
}

/* --------------------------------- Events ------------------------------------- */
function toggleFav(id) {
  state.favs[id] = toggleFavorite(id);
  const filtered = getSortedListings(getFilteredListings());
  const pageItems = filtered.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
  renderGrid(pageItems);
  renderRecentlyViewed();
  refreshIcons();
}

function goToPage(p) {
  state.page = p;
  renderAll();
  document.getElementById("resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

window.addEventListener(BLOCKED_USERS_UPDATED_EVENT, () => {
  renderAll();
  renderRecentlyViewed();
});

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  renderRecentlyViewed();

  const searchInput = document.getElementById("browseSearch");
  searchInput.value = state.query;
  let searchDebounce;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchDebounce);
    const value = e.target.value;
    searchDebounce = setTimeout(() => {
      state.query = value;
      state.page = 1;
      renderAll();
    }, 200);
  });

  /* ------------------------------- Categories sheet ------------------------------- */
  document.getElementById("openCategoriesBtn").addEventListener("click", () => {
    renderCategoryTiles();
    openSheet("categorySheet");
  });
  document.getElementById("categorySheetClose").addEventListener("click", () => closeSheet("categorySheet"));
  wireSheetDismiss("categorySheet");
  document.getElementById("catTileGrid").addEventListener("click", (e) => {
    const tile = e.target.closest("[data-category]");
    if (!tile) return;
    state.category = tile.dataset.category;
    state.page = 1;
    closeSheet("categorySheet");
    renderAll();
  });

  /* -------------------------------- Location sheet -------------------------------- */
  document.getElementById("openLocationBtn").addEventListener("click", openLocationSheet);
  document.getElementById("locationSheetClose").addEventListener("click", () => closeSheet("locationSheet"));
  wireSheetDismiss("locationSheet");

  const locationInput = document.getElementById("locationSearchInput");
  locationInput.addEventListener("input", (e) => {
    const value = e.target.value.trim();
    clearTimeout(geocodeDebounce);
    if (value.length < 3) {
      renderLocationSuggestions([]);
      return;
    }
    geocodeDebounce = setTimeout(async () => {
      const requestId = ++geocodeRequestId;
      const results = await geocodeSearch(value);
      if (requestId !== geocodeRequestId) return; // a newer keystroke superseded this request
      lastGeocodeResults = results;
      renderLocationSuggestions(results);
    }, 350);
  });

  document.getElementById("locationSuggestions").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-suggestion-index]");
    if (!btn) return;
    const result = lastGeocodeResults[Number(btn.dataset.suggestionIndex)];
    if (!result) return;
    pendingOrigin = { lat: result.lat, lng: result.lng, label: result.label, isMe: false };
    locationInput.value = result.label;
    renderLocationSuggestions([]);
    setLocationStatus(`Set to ${result.label}`, "is-active");
  });

  document.getElementById("locationUseMeBtn").addEventListener("click", async () => {
    const btn = document.getElementById("locationUseMeBtn");
    const label = document.getElementById("locationUseMeLabel");
    label.textContent = "Locating…";
    btn.disabled = true;
    try {
      await requestUserLocation();
      // Reverse-geocode for a real, worldwide place name — works anywhere on
      // Earth, unlike a fixed list of seeded demo metro areas.
      const reverse = await reverseGeocode(userGeoState.lat, userGeoState.lng);
      const realLabel = formatRealLocationLabel(reverse) || "Your current location";
      pendingOrigin = { lat: userGeoState.lat, lng: userGeoState.lng, label: realLabel, isMe: true };
      locationInput.value = "";
      renderLocationSuggestions([]);
      setLocationStatus(`Using your current location — ${realLabel}`, "is-active");
      if (reverse && reverse.countryCode && typeof applyDetectedCountry === "function") {
        applyDetectedCountry(reverse.countryCode);
      }
    } catch (err) {
      setLocationStatus(userGeoState.error || "Couldn't get your location.", "is-error");
    } finally {
      label.textContent = "Use my current location";
      btn.disabled = false;
    }
  });

  const radiusSlider = document.getElementById("radiusSlider");
  radiusSlider.addEventListener("input", (e) => {
    pendingRadiusKm = Number(e.target.value);
    updateRadiusLabel();
  });

  document.getElementById("locationClearBtn").addEventListener("click", () => {
    pendingOrigin = null;
    pendingRadiusKm = DEFAULT_RADIUS_KM;
    state.origin = null;
    state.radiusKm = DEFAULT_RADIUS_KM;
    state.page = 1;
    closeSheet("locationSheet");
    renderAll();
  });

  document.getElementById("locationApplyBtn").addEventListener("click", () => {
    state.origin = pendingOrigin;
    state.radiusKm = pendingRadiusKm;
    state.page = 1;
    closeSheet("locationSheet");
    renderAll();
  });

  /* --------------------------------- Filters sheet -------------------------------- */
  document.getElementById("filterToggleBtn").addEventListener("click", () => openSheet("filtersSheet"));
  document.getElementById("filtersSheetClose").addEventListener("click", () => closeSheet("filtersSheet"));
  wireSheetDismiss("filtersSheet");

  document.getElementById("filterCondition").addEventListener("change", (e) => {
    state.condition = e.target.value;
    state.page = 1;
    renderAll();
  });

  document.getElementById("resultsSort").addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    renderAll();
  });

  const minInput = document.getElementById("filterPriceMin");
  const maxInput = document.getElementById("filterPriceMax");
  const applyPrice = () => {
    state.minPrice = minInput.value === "" ? null : Math.max(0, Number(minInput.value));
    state.maxPrice = maxInput.value === "" ? null : Math.max(0, Number(maxInput.value));
    state.page = 1;
    renderAll();
  };
  minInput.addEventListener("change", applyPrice);
  maxInput.addEventListener("change", applyPrice);

  document.getElementById("filtersApplyBtn").addEventListener("click", () => {
    applyPrice();
    closeSheet("filtersSheet");
    document.getElementById("resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("filtersResetBtn").addEventListener("click", () => {
    resetFilters();
    closeSheet("filtersSheet");
  });

  document.getElementById("saveSearchBtn").addEventListener("click", () => {
    const btn = document.getElementById("saveSearchBtn");
    saveSearch(state);
    const original = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="check"></i> Saved`;
    btn.disabled = true;
    refreshIcons();
    setTimeout(() => {
      btn.innerHTML = original;
      btn.disabled = false;
      refreshIcons();
    }, 1600);
  });

  document.getElementById("gridViewBtn").addEventListener("click", () => setView("grid"));
  document.getElementById("mapViewBtn").addEventListener("click", () => setView("map"));

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    ["categorySheet", "locationSheet", "filtersSheet"].forEach((id) => {
      const overlay = document.getElementById(id);
      if (overlay && overlay.classList.contains("open")) closeSheet(id);
    });
  });

  document.addEventListener("click", (e) => {
    const chipRemove = e.target.closest("[data-chip-remove]");
    if (chipRemove) {
      const key = chipRemove.dataset.chipRemove;
      if (key === "category") state.category = "All categories";
      if (key === "price") { state.minPrice = null; state.maxPrice = null; minInput.value = ""; maxInput.value = ""; }
      if (key === "condition") state.condition = "Any condition";
      if (key === "origin") { state.origin = null; state.radiusKm = DEFAULT_RADIUS_KM; pendingOrigin = null; pendingRadiusKm = DEFAULT_RADIUS_KM; }
      if (key === "query") { state.query = ""; searchInput.value = ""; }
      state.page = 1;
      renderAll();
      return;
    }

    if (e.target.closest("#chipClearAll") || e.target.closest("#emptyClearBtn")) {
      resetFilters();
      return;
    }

    const pageBtn = e.target.closest("[data-page]");
    if (pageBtn) {
      goToPage(Number(pageBtn.dataset.page));
      return;
    }

    const pageNav = e.target.closest("[data-page-nav]");
    if (pageNav && !pageNav.disabled) {
      const dir = pageNav.dataset.pageNav === "prev" ? -1 : 1;
      goToPage(state.page + dir);
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

  renderBottomNav("search");

  // index.html's hero filter button links here with ?filters=open so the
  // Filters sheet is already open when the page lands.
  if (new URLSearchParams(window.location.search).get("filters") === "open") {
    openSheet("filtersSheet");
  }
});

window.addEventListener("marka:currency-changed", () => {
  if (typeof renderAll === "function") renderAll();
});

window.addEventListener("load", refreshIcons);

// Leaflet sizes its canvas from the container's dimensions at creation time,
// so without this a map that's already open goes stale — showing grey/
// misaligned tiles — after a resize or phone rotation instead of adapting.
let mapResizeTimer = null;
window.addEventListener("resize", () => {
  if (!browseMap) return;
  clearTimeout(mapResizeTimer);
  mapResizeTimer = setTimeout(() => browseMap.invalidateSize(), 150);
});
