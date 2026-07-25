/* ============================================================================
   MARKA — Individual category page logic
   Reads ?slug= off the URL, renders that category's header + subcategory
   pills (js/categories-data.js), and lists its listings with the same sort
   options browse.html uses (js/browse-data.js's BROWSE_SORT_OPTIONS) so the
   experience feels consistent across both browsing paths.
   ============================================================================ */

const state = {
  category: null,
  subcategory: "All",
  sortBy: "newest",
  favs: {},
};

function getRequestedSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug") || "";
}

function sortListings(list) {
  const arr = [...list];
  if (state.sortBy === "price-low") arr.sort((a, b) => a.priceValue - b.priceValue);
  else if (state.sortBy === "price-high") arr.sort((a, b) => b.priceValue - a.priceValue);
  else arr.sort((a, b) => a.id - b.id); // "newest" stand-in — same idea as browse.js's hoursAgo sort
  return arr;
}

function renderBreadcrumb() {
  document.getElementById("breadcrumb").innerHTML = `
    <a href="index.html">Home</a>
    <i data-lucide="chevron-right"></i>
    <a href="categories.html">Categories</a>
    <i data-lucide="chevron-right"></i>
    <span aria-current="page">${state.category.label}</span>`;
}

function renderHero() {
  const c = state.category;
  document.getElementById("categoryHero").innerHTML = `
    <div class="category-hero-icon" style="background:${c.bg}">
      <i data-lucide="${c.icon}" style="color:${c.color}"></i>
    </div>
    <div>
      <h1 class="category-hero-title">${c.label}</h1>
      <p class="category-hero-desc">${c.description}</p>
    </div>`;
  document.getElementById("pageTitle").textContent = `${c.label} — Marka`;
}

function renderSubcats() {
  const names = ["All", ...state.category.subcategories];
  document.getElementById("subcatRow").innerHTML = names
    .map(
      (name) => `
    <button type="button" class="subcat-pill ${state.subcategory === name ? "active" : ""}" data-subcat="${name}">${name}</button>`
    )
    .join("");
}

function renderSortOptions() {
  const sel = document.getElementById("categorySort");
  sel.innerHTML = BROWSE_SORT_OPTIONS.filter((o) => o.value !== "popular")
    .map((o) => `<option value="${o.value}">${o.label}</option>`)
    .join("");
  sel.value = state.sortBy;
}

function renderResults() {
  const listings = sortListings(getCategoryListings(state.category.label, state.subcategory));
  document.getElementById("resultsCount").innerHTML = `<strong>${listings.length}</strong> Result${listings.length === 1 ? "" : "s"}`;

  const grid = document.getElementById("categoryGrid");
  const empty = document.getElementById("emptyState");

  if (!listings.length) {
    grid.hidden = true;
    grid.innerHTML = "";
    empty.hidden = false;
    refreshIcons();
    return;
  }

  empty.hidden = true;
  grid.hidden = false;
  grid.innerHTML = listings
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
        </div>
      </div>
    </div>`
    )
    .join("");
  refreshIcons();
}

function renderAll() {
  renderNavLinks("Categories");
  renderBreadcrumb();
  renderHero();
  renderSubcats();
  renderSortOptions();
  renderResults();
  renderBottomNav("search");
  refreshIcons();
}

document.addEventListener("DOMContentLoaded", () => {
  const slug = getRequestedSlug();
  const category = getCategoryBySlug(slug);

  if (!category) {
    window.location.href = "categories.html";
    return;
  }
  state.category = category;
  renderAll();

  document.getElementById("categorySort").addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    renderResults();
  });

  document.addEventListener("click", (e) => {
    const pill = e.target.closest("[data-subcat]");
    if (pill) {
      state.subcategory = pill.dataset.subcat;
      renderSubcats();
      renderResults();
      return;
    }

    const favBtn = e.target.closest("[data-fav-id]");
    if (favBtn) {
      state.favs[favBtn.dataset.favId] = !state.favs[favBtn.dataset.favId];
      renderResults();
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

  window.addEventListener(BLOCKED_USERS_UPDATED_EVENT, renderResults);
});

window.addEventListener("load", refreshIcons);
