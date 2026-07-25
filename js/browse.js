/* ============================================================================
   MARKA — Browse page logic
   Search-results / category-browsing experience between the home page and
   the listing page. Shares NAV_LINKS / BOTTOM_NAV / priceStub() /
   favButtonHTML() / refreshIcons() with the rest of the site via js/common.js,
   and its dataset with js/browse-data.js.
   ============================================================================ */

const PER_PAGE = 4;

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

const state = {
  query: getRequestedQuery(),
  category: getRequestedCategory(), // e.g. browse.html?category=Electronics -> "Home > Electronics"
  minPrice: getRequestedNumber("min"),
  maxPrice: getRequestedNumber("max"),
  condition: getRequestedOption("condition", BROWSE_CONDITION_OPTIONS, "Any condition"),
  location: getRequestedOption("location", BROWSE_LOCATION_OPTIONS, "All locations"),
  province: getRequestedOption("province", BROWSE_PROVINCE_OPTIONS, "All provinces"),
  city: "All cities",
  nearMe: false,
  radiusKm: DISTANCE_RADIUS_OPTIONS[2], // 25km default once "near me" is on
  sortBy: "newest",
  view: "grid", // "grid" | "map"
  page: 1,
  favs: Object.fromEntries(getFavoriteIds().map((id) => [id, true])),
};

let browseMap = null;
let browseMapMarkers = [];

/* --------------------------------- Helpers ------------------------------------ */
// Attaches a live distanceKm (and formatted label) to every listing once the
// user's location is known — used by both the sort and the card badges.
function withDistances(list) {
  if (userGeoState.status !== "granted") return list;
  return list.map((l) => {
    const distanceKm = l.lat !== null && l.lng !== null ? haversineDistanceKm(userGeoState.lat, userGeoState.lng, l.lat, l.lng) : null;
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
    if (state.location !== "All locations" && l.loc !== state.location) return false;
    if (state.province !== "All provinces" && l.province !== state.province) return false;
    if (state.city !== "All cities" && l.city !== state.city) return false;
    if (isUserBlocked(l.sellerName)) return false;
    return true;
  });

  list = withDistances(list);

  if (state.nearMe && userGeoState.status === "granted") {
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
  state.location = "All locations";
  state.province = "All provinces";
  state.city = "All cities";
  state.nearMe = false;
  state.page = 1;
  document.getElementById("browseSearch").value = "";
  document.getElementById("filterCategory").value = "All categories";
  document.getElementById("filterPriceMin").value = "";
  document.getElementById("filterPriceMax").value = "";
  document.getElementById("filterCondition").value = "Any condition";
  document.getElementById("filterLocation").value = "All locations";
  document.getElementById("useMyLocationBtn").classList.remove("active");
  document.getElementById("filterRadius").disabled = true;
  document.getElementById("distanceStatus").textContent = "";
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

function renderFilterOptions() {
  const catSel = document.getElementById("filterCategory");
  catSel.innerHTML = BROWSE_CATEGORY_OPTIONS.map((c) => `<option value="${c}">${c}</option>`).join("");
  catSel.value = state.category;

  const condSel = document.getElementById("filterCondition");
  condSel.innerHTML = BROWSE_CONDITION_OPTIONS.map((c) => `<option value="${c}">${c}</option>`).join("");
  condSel.value = state.condition;

  const locSel = document.getElementById("filterLocation");
  locSel.innerHTML = BROWSE_LOCATION_OPTIONS.map((l) => `<option value="${l}">${l}</option>`).join("");
  locSel.value = state.location;

  const provSel = document.getElementById("filterProvince");
  provSel.innerHTML = BROWSE_PROVINCE_OPTIONS.map((code) => {
    const p = findProvince(code);
    return `<option value="${code}">${p ? p.name : code}</option>`;
  }).join("");
  provSel.value = state.province;

  const citySel = document.getElementById("filterCity");
  const cityOptions = getBrowseCitiesForProvince(state.province);
  if (!cityOptions.includes(state.city)) state.city = "All cities";
  citySel.innerHTML = cityOptions.map((c) => `<option value="${c}">${c}</option>`).join("");
  citySel.value = state.city;
  citySel.disabled = state.province === "All provinces";

  const radiusSel = document.getElementById("filterRadius");
  radiusSel.innerHTML = DISTANCE_RADIUS_OPTIONS.map((km) => `<option value="${km}">Within ${km} km</option>`).join("");
  radiusSel.value = state.radiusKm;
  radiusSel.disabled = userGeoState.status !== "granted";

  document.getElementById("filterPriceMin").value = state.minPrice ?? "";
  document.getElementById("filterPriceMax").value = state.maxPrice ?? "";

  const sortOptions = BROWSE_SORT_OPTIONS.slice();
  if (userGeoState.status === "granted") sortOptions.push({ value: "distance", label: "Nearest to me" });
  else if (state.sortBy === "distance") state.sortBy = "newest";
  const sortSel = document.getElementById("resultsSort");
  sortSel.innerHTML = sortOptions.map((s) => `<option value="${s.value}">${s.label}</option>`).join("");
  sortSel.value = state.sortBy;

  const locateBtn = document.getElementById("useMyLocationBtn");
  locateBtn.classList.toggle("active", state.nearMe && userGeoState.status === "granted");
}

function renderChips() {
  const row = document.getElementById("filterChips");
  const chips = [];

  if (state.category !== "All categories") chips.push({ key: "category", label: state.category });
  if (state.minPrice !== null && state.maxPrice !== null) chips.push({ key: "price", label: `${formatPrice(state.minPrice)} – ${formatPrice(state.maxPrice)}` });
  else if (state.minPrice !== null) chips.push({ key: "price", label: `From ${formatPrice(state.minPrice)}` });
  else if (state.maxPrice !== null) chips.push({ key: "price", label: `Under ${formatPrice(state.maxPrice)}` });
  if (state.condition !== "Any condition") chips.push({ key: "condition", label: state.condition });
  if (state.location !== "All locations") chips.push({ key: "location", label: state.location });
  if (state.province !== "All provinces") {
    const p = findProvince(state.province);
    chips.push({ key: "province", label: p ? p.name : state.province });
  }
  if (state.city !== "All cities") chips.push({ key: "city", label: state.city });
  if (state.nearMe && userGeoState.status === "granted") chips.push({ key: "nearMe", label: `Within ${state.radiusKm} km` });
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
        ${userGeoState.status === "granted" && item.distanceKm !== null ? `<div class="card-distance"><i data-lucide="navigation"></i>${formatDistance(item.distanceKm)}</div>` : ""}
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
    const distanceLabel = userGeoState.status === "granted" && item.distanceKm !== null ? `<div class="map-popup-loc">${formatDistance(item.distanceKm)}</div>` : "";
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
    if (userGeoState.status === "granted") bounds.extend([userGeoState.lat, userGeoState.lng]);
    map.fitBounds(bounds.pad(0.25), { maxZoom: 13 });
  }

  if (userGeoState.status === "granted") {
    L.circleMarker([userGeoState.lat, userGeoState.lng], {
      radius: 7,
      color: "#2F5D62",
      fillColor: "#2F5D62",
      fillOpacity: 0.9,
      weight: 2,
    })
      .addTo(map)
      .bindPopup("You are here");
  }
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

  document.getElementById("filterCategory").addEventListener("change", (e) => {
    state.category = e.target.value;
    state.page = 1;
    renderAll();
  });

  document.getElementById("filterCondition").addEventListener("change", (e) => {
    state.condition = e.target.value;
    state.page = 1;
    renderAll();
  });

  document.getElementById("filterLocation").addEventListener("change", (e) => {
    state.location = e.target.value;
    state.page = 1;
    renderAll();
  });

  document.getElementById("filterProvince").addEventListener("change", (e) => {
    state.province = e.target.value;
    state.city = "All cities";
    state.page = 1;
    renderAll();
  });

  document.getElementById("filterCity").addEventListener("change", (e) => {
    state.city = e.target.value;
    state.page = 1;
    renderAll();
  });

  document.getElementById("filterRadius").addEventListener("change", (e) => {
    state.radiusKm = Number(e.target.value);
    state.page = 1;
    renderAll();
  });

  document.getElementById("useMyLocationBtn").addEventListener("click", async () => {
    const btn = document.getElementById("useMyLocationBtn");
    const label = document.getElementById("useMyLocationLabel");
    const status = document.getElementById("distanceStatus");

    if (state.nearMe && userGeoState.status === "granted") {
      // Toggle off
      state.nearMe = false;
      btn.classList.remove("active");
      status.textContent = "";
      status.classList.remove("is-error");
      renderAll();
      return;
    }

    label.textContent = "Locating…";
    btn.disabled = true;
    status.classList.remove("is-error");
    status.textContent = "";
    try {
      await requestUserLocation();
      state.nearMe = true;
      // Reverse-geocode for a real, worldwide place name — findNearestCity
      // only recognizes the seeded demo metro areas, so using it here would
      // mislabel anyone outside them as whichever of those happens to be
      // closest (e.g. showing "Boston" to someone nowhere near it).
      const reverse = await reverseGeocode(userGeoState.lat, userGeoState.lng);
      const realLabel = formatRealLocationLabel(reverse);
      status.textContent = realLabel ? `Near ${realLabel}` : "Location found";
      if (reverse && reverse.countryCode && typeof applyDetectedCountry === "function") {
        applyDetectedCountry(reverse.countryCode);
      }
    } catch (err) {
      status.classList.add("is-error");
      status.textContent = userGeoState.error || "Couldn't get your location.";
    } finally {
      label.textContent = "Search near me";
      btn.disabled = false;
      state.page = 1;
      renderAll();
    }
  });

  document.getElementById("gridViewBtn").addEventListener("click", () => setView("grid"));
  document.getElementById("mapViewBtn").addEventListener("click", () => setView("map"));

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

  document.getElementById("filterApplyBtn").addEventListener("click", () => {
    applyPrice();
    document.getElementById("resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("filterToggleBtn").addEventListener("click", () => {
    document.getElementById("filterBar").classList.toggle("filter-bar--open");
  });

  // index.html's hero filter button links here with ?filters=open so the
  // filter bar is already expanded when the page lands, instead of making
  // people tap the toggle a second time.
  if (new URLSearchParams(window.location.search).get("filters") === "open") {
    document.getElementById("filterBar").classList.add("filter-bar--open");
  }

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

  document.addEventListener("click", (e) => {
    const chipRemove = e.target.closest("[data-chip-remove]");
    if (chipRemove) {
      const key = chipRemove.dataset.chipRemove;
      if (key === "category") state.category = "All categories";
      if (key === "price") { state.minPrice = null; state.maxPrice = null; minInput.value = ""; maxInput.value = ""; }
      if (key === "condition") state.condition = "Any condition";
      if (key === "location") state.location = "All locations";
      if (key === "province") { state.province = "All provinces"; state.city = "All cities"; }
      if (key === "city") state.city = "All cities";
      if (key === "nearMe") { state.nearMe = false; document.getElementById("useMyLocationBtn").classList.remove("active"); }
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
