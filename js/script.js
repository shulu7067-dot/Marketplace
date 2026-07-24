/* ============================================================================
   MARKA — Home page logic
   Vanilla JS port of the original React component: same mock data, same
   interactions (favorite toggling, bottom-nav tab state), same markup shape.
   ============================================================================ */

/* --------------------------------- Mock data -------------------------------- */
const CATEGORIES = [
  { label: "Vehicles", icon: "car", color: "#2F5D62", bg: "#E4EEEE" },
  { label: "Bikes", icon: "bike", color: "#5B4B9A", bg: "#ECE8F6" },
  { label: "Property", icon: "home", color: "#C6841F", bg: "#F7E8CE" },
  { label: "Electronics", icon: "monitor", color: "#B0472D", bg: "#F6E2DC" },
  { label: "Phones", icon: "smartphone", color: "#1F8A4C", bg: "#DFF3E6" },
  { label: "All categories", icon: "grid-3x3", color: "#16213E", bg: "#E7EAF2" },
];

const FEATURED = [
  { id: 1, title: "Coastal 4-bed family home", price: "$412,000", loc: "Riverside, NY", tag: "Property", boosted: true, grad: ["#2F5D62", "#16213E"] },
  { id: 2, title: "'98 Land Cruiser, restored", price: "$18,500", loc: "Queens, NY", tag: "Vehicles", boosted: true, grad: ["#C6841F", "#8A5A12"] },
  { id: 3, title: "Cannondale gravel bike", price: "$1,150", loc: "Brooklyn, NY", tag: "Bikes", boosted: false, grad: ["#5B4B9A", "#2F5D62"] },
];

const LISTINGS = [
  { id: 1, title: "Trek Marlin 7 mountain bike", price: "$540", loc: "Brooklyn, US", time: "2h", grad: ["#2F5D62", "#16213E"] },
  { id: 2, title: "2016 CEO fleet sedan", price: "$8,002", loc: "New York, US", time: "4h", grad: ["#C6841F", "#8A5A12"] },
  { id: 3, title: "Restored '46 roadster", price: "$8,999", loc: "New York, US", time: "6h", grad: ["#5B4B9A", "#2F5D62"] },
  { id: 4, title: "Dual 24in monitor setup", price: "$1,020", loc: "New York, US", time: "9h", grad: ["#16213E", "#0D1730"] },
  { id: 5, title: "Modern 200m² family house", price: "$9,541", loc: "New York, US", time: "1d", grad: ["#2F5D62", "#5B4B9A"] },
  { id: 6, title: "iPhone 14 Pro, unlocked", price: "$690", loc: "New York, US", time: "1d", grad: ["#B0472D", "#8A5A12"] },
];

const NAV_LINKS = ["Home", "Categories", "Blog", "Contact"];

const BOTTOM_NAV = [
  { id: "home", label: "Home", icon: "home" },
  { id: "favorites", label: "Favorites", icon: "heart" },
  { id: "sell", label: "Sell", icon: "plus", isSell: true },
  { id: "search", label: "Search", icon: "search" },
  { id: "profile", label: "Profile", icon: "user" },
];

/* --------------------------------- State ------------------------------------ */
const state = {
  favs: {},
  tab: "home",
};

/* -------------------------------- Helpers ------------------------------------ */
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function priceStub(price) {
  return `
    <div class="price-stub">
      <div class="price-stub-inner">
        <span class="price-text">${price}</span>
        <span class="price-stub-dot"></span>
      </div>
    </div>`;
}

function favButton(id) {
  const active = !!state.favs[id];
  return `
    <button class="fav-btn ${active ? "active" : ""}" data-fav-id="${id}" aria-label="Toggle favorite">
      <i data-lucide="heart"></i>
    </button>`;
}

/* --------------------------------- Renderers ---------------------------------- */
function renderNavLinks() {
  const nav = document.getElementById("navLinks");
  nav.innerHTML = NAV_LINKS.map(
    (label, i) => `<span class="${i === 0 ? "active" : ""}">${label}</span>`
  ).join("");
}

function renderCategories() {
  const grid = document.getElementById("categoriesGrid");
  grid.innerHTML = CATEGORIES.map(
    (c) => `
    <div class="category-card">
      <div class="category-icon" style="background:${c.bg}">
        <i data-lucide="${c.icon}" style="color:${c.color}"></i>
      </div>
      <span class="category-label">${c.label}</span>
    </div>`
  ).join("");
}

function renderFeatured() {
  const row = document.getElementById("featuredRow");
  row.innerHTML = FEATURED.map(
    (item) => `
    <div class="featured-card">
      <div class="featured-media" style="background:linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})">
        ${item.boosted ? `<div class="boosted-badge"><i data-lucide="zap"></i> Boosted</div>` : ""}
        ${favButton(item.id)}
      </div>
      <div class="featured-body">
        <div class="featured-tag">${item.tag}</div>
        <div class="card-title">${item.title}</div>
        <div class="card-footer">${priceStub(item.price)}</div>
      </div>
    </div>`
  ).join("");
}

function renderListings() {
  const grid = document.getElementById("listingsGrid");
  grid.innerHTML = LISTINGS.map(
    (item) => `
    <div class="listing-card">
      <div class="listing-media" style="background:linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})">
        ${favButton(item.id + 100)}
      </div>
      <div class="listing-body">
        <div class="card-title truncate">${item.title}</div>
        <div class="card-loc"><i data-lucide="map-pin"></i><span>${item.loc}</span></div>
        <div class="card-footer">
          ${priceStub(item.price)}
          <span class="card-time">${item.time} ago</span>
        </div>
      </div>
    </div>`
  ).join("");
}

function renderBottomNav() {
  const nav = document.getElementById("bottomNav");
  const inner = document.createElement("div");
  inner.className = "bottom-nav-inner";
  inner.innerHTML = BOTTOM_NAV.map((n) => {
    const active = state.tab === n.id;
    if (n.isSell) {
      return `<button class="nav-item nav-item--sell" data-tab="${n.id}" aria-label="${n.label}">
        <i data-lucide="${n.icon}"></i>
      </button>`;
    }
    return `<button class="nav-item ${active ? "active" : ""}" data-tab="${n.id}">
      <i data-lucide="${n.icon}" ${active && n.id === "favorites" ? 'style="fill:currentColor"' : ""}></i>
      <span>${n.label}</span>
    </button>`;
  }).join("");
  nav.innerHTML = "";
  nav.appendChild(inner);
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function renderAll() {
  renderNavLinks();
  renderCategories();
  renderFeatured();
  renderListings();
  renderBottomNav();
  refreshIcons();
}

/* --------------------------------- Events ------------------------------------- */
function toggleFav(id) {
  state.favs[id] = !state.favs[id];
  renderFeatured();
  renderListings();
  refreshIcons();
}

function setTab(tabId) {
  state.tab = tabId;
  renderBottomNav();
  refreshIcons();
}

document.addEventListener("click", (e) => {
  const favBtn = e.target.closest("[data-fav-id]");
  if (favBtn) {
    toggleFav(Number(favBtn.dataset.favId));
    return;
  }
  const tabBtn = e.target.closest("[data-tab]");
  if (tabBtn) {
    setTab(tabBtn.dataset.tab);
    return;
  }
});

function initCategoriesCarousel() {
  const track = document.getElementById("categoriesGrid");
  const left = document.getElementById("catArrowLeft");
  const right = document.getElementById("catArrowRight");
  if (!track || !left || !right) return;

  const scrollByPage = (dir) => {
    // Scroll by ~80% of the visible width so one arrow click moves roughly
    // "one page" of categories while keeping a peek of the next card.
    track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: "smooth" });
  };

  left.addEventListener("click", () => scrollByPage(-1));
  right.addEventListener("click", () => scrollByPage(1));

  const updateArrows = () => {
    const maxScroll = track.scrollWidth - track.clientWidth - 1;
    left.style.visibility = track.scrollLeft <= 0 ? "hidden" : "visible";
    right.style.visibility = track.scrollLeft >= maxScroll ? "hidden" : "visible";
  };

  track.addEventListener("scroll", updateArrows);
  window.addEventListener("resize", updateArrows);
  updateArrows();
}

/* ---------------------------------- Init --------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  initCategoriesCarousel();
});

// In case lucide loads after DOMContentLoaded (it's deferred), re-run icon creation.
window.addEventListener("load", refreshIcons);
