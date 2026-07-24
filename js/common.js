/* ============================================================================
   MARKA — Shared utilities
   Loaded on every page, before the page's own script. Holds the bits that are
   identical across the whole site: primary nav labels, bottom nav items, and
   the small render helpers (price stub, favorite button, icon refresh) that
   every card — home page or listing page — is built from.
   ============================================================================ */

const NAV_LINKS = ["Home", "Categories", "Blog", "Contact"];

const BOTTOM_NAV = [
  { id: "home", label: "Home", icon: "home", href: "index.html" },
  { id: "favorites", label: "Favorites", icon: "heart" },
  { id: "sell", label: "Sell", icon: "plus", isSell: true },
  { id: "search", label: "Search", icon: "search" },
  { id: "profile", label: "Profile", icon: "user" },
];

/* ------------------------------ Render helpers ------------------------------- */
function priceStub(price) {
  return `
    <div class="price-stub">
      <div class="price-stub-inner">
        <span class="price-text">${price}</span>
        <span class="price-stub-dot"></span>
      </div>
    </div>`;
}

function favButtonHTML(id, isActive) {
  return `
    <button class="fav-btn ${isActive ? "active" : ""}" data-fav-id="${id}" aria-label="Toggle favorite">
      <i data-lucide="heart"></i>
    </button>`;
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

/* --------------------------------- Top nav ------------------------------------ */
// activeLabel lets each page decide which primary nav item (if any) is current.
function renderNavLinks(activeLabel = "Home") {
  const nav = document.getElementById("navLinks");
  if (!nav) return;
  nav.innerHTML = NAV_LINKS.map(
    (label) => `<span class="${label === activeLabel ? "active" : ""}">${label}</span>`
  ).join("");
}

/* -------------------------------- Bottom nav ----------------------------------- */
function renderBottomNav(activeTab) {
  const nav = document.getElementById("bottomNav");
  if (!nav) return;
  const inner = document.createElement("div");
  inner.className = "bottom-nav-inner";
  inner.innerHTML = BOTTOM_NAV.map((n) => {
    const active = activeTab === n.id;
    if (n.isSell) {
      return `<button class="nav-item nav-item--sell" data-tab="${n.id}" aria-label="${n.label}">
        <i data-lucide="${n.icon}"></i>
      </button>`;
    }
    const tag = n.href ? "a" : "button";
    const hrefAttr = n.href ? `href="${n.href}"` : "";
    return `<${tag} class="nav-item ${active ? "active" : ""}" data-tab="${n.id}" ${hrefAttr}>
      <i data-lucide="${n.icon}" ${active && n.id === "favorites" ? 'style="fill:currentColor"' : ""}></i>
      <span>${n.label}</span>
    </${tag}>`;
  }).join("");
  nav.innerHTML = "";
  nav.appendChild(inner);
}
