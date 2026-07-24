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

const state = {
  query: "",
  category: getRequestedCategory(), // e.g. browse.html?category=Electronics -> "Home > Electronics"
  minPrice: null,
  maxPrice: null,
  condition: "Any condition",
  location: "All locations",
  sortBy: "newest",
  page: 1,
  favs: {},
};

/* --------------------------------- Helpers ------------------------------------ */
function getFilteredListings() {
  const q = state.query.trim().toLowerCase();
  return BROWSE_LISTINGS.filter((l) => {
    if (q && !l.title.toLowerCase().includes(q)) return false;
    if (state.category !== "All categories" && l.tag !== state.category) return false;
    if (state.minPrice !== null && l.priceValue < state.minPrice) return false;
    if (state.maxPrice !== null && l.priceValue > state.maxPrice) return false;
    if (state.condition !== "Any condition" && l.condition !== state.condition) return false;
    if (state.location !== "All locations" && l.loc !== state.location) return false;
    return true;
  });
}

function getSortedListings(list) {
  const arr = [...list];
  if (state.sortBy === "price-low") arr.sort((a, b) => a.priceValue - b.priceValue);
  else if (state.sortBy === "price-high") arr.sort((a, b) => b.priceValue - a.priceValue);
  else if (state.sortBy === "popular") arr.sort((a, b) => b.popularity - a.popularity);
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
  state.page = 1;
  document.getElementById("browseSearch").value = "";
  document.getElementById("filterCategory").value = "All categories";
  document.getElementById("filterPriceMin").value = "";
  document.getElementById("filterPriceMax").value = "";
  document.getElementById("filterCondition").value = "Any condition";
  document.getElementById("filterLocation").value = "All locations";
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

  const sortSel = document.getElementById("resultsSort");
  sortSel.innerHTML = BROWSE_SORT_OPTIONS.map((s) => `<option value="${s.value}">${s.label}</option>`).join("");
  sortSel.value = state.sortBy;
}

function renderChips() {
  const row = document.getElementById("filterChips");
  const chips = [];

  if (state.category !== "All categories") chips.push({ key: "category", label: state.category });
  if (state.minPrice !== null && state.maxPrice !== null) chips.push({ key: "price", label: `$${state.minPrice} – $${state.maxPrice}` });
  else if (state.minPrice !== null) chips.push({ key: "price", label: `From $${state.minPrice}` });
  else if (state.maxPrice !== null) chips.push({ key: "price", label: `Under $${state.maxPrice}` });
  if (state.condition !== "Any condition") chips.push({ key: "condition", label: state.condition });
  if (state.location !== "All locations") chips.push({ key: "location", label: state.location });
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
  const items = RECENTLY_VIEWED_IDS.map((id) => BROWSE_LISTINGS.find((l) => l.id === id)).filter(Boolean);
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
  renderGrid(pageItems);
  renderPagination(totalPages);
  refreshIcons();
}

/* --------------------------------- Events ------------------------------------- */
function toggleFav(id) {
  state.favs[id] = !state.favs[id];
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

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  renderRecentlyViewed();

  const searchInput = document.getElementById("browseSearch");
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

  document.addEventListener("click", (e) => {
    const chipRemove = e.target.closest("[data-chip-remove]");
    if (chipRemove) {
      const key = chipRemove.dataset.chipRemove;
      if (key === "category") state.category = "All categories";
      if (key === "price") { state.minPrice = null; state.maxPrice = null; minInput.value = ""; maxInput.value = ""; }
      if (key === "condition") state.condition = "Any condition";
      if (key === "location") state.location = "All locations";
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

window.addEventListener("load", refreshIcons);
