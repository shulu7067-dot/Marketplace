/* ============================================================================
   MARKA — Shared utilities
   Loaded on every page, before the page's own script. Holds the bits that are
   identical across the whole site: primary nav labels, bottom nav items, and
   the small render helpers (price stub, favorite button, icon refresh) that
   every card — home page or listing page — is built from.
   ============================================================================ */

const NAV_LINKS = ["Home", "Categories", "Blog", "Contact"];
const NAV_LINK_HREFS = { Home: "index.html", Categories: "categories.html" };

const BOTTOM_NAV = [
  { id: "home", label: "Home", icon: "home", href: "index.html" },
  { id: "favorites", label: "Favorites", icon: "heart" },
  { id: "sell", label: "Sell", icon: "plus", isSell: true, href: "sell.html" },
  { id: "search", label: "Search", icon: "search", href: "browse.html" },
  { id: "profile", label: "Profile", icon: "user", href: "profile.html" },
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

// Card/gallery media background: real uploaded photos (data-URL strings) take
// priority, falling back to the gradient-pair placeholders the demo data uses.
function cardMediaStyle(item) {
  const first = item.images ? item.images[0] : null;
  if (typeof first === "string") {
    return `background-image:url('${first}');background-size:cover;background-position:center;`;
  }
  if (item.grad) return `background:linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})`;
  return "";
}

// Lightweight confirm dialog built on the shared .modal-overlay component
// (css/modal.css). Resolves true/false — no static HTML needed per page.
function confirmModal({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h2 class="modal-title">${title}</h2>
          <button type="button" class="modal-close" aria-label="Close"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body"><p style="margin:0;">${message}</p></div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" data-action="cancel">${cancelLabel}</button>
          <button type="button" class="btn-primary ${danger ? "btn-danger" : ""}" data-action="confirm">${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    refreshIcons();
    requestAnimationFrame(() => overlay.classList.add("open"));

    function cleanup(result) {
      overlay.classList.remove("open");
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) return cleanup(false);
      if (e.target.closest(".modal-close")) return cleanup(false);
      const btn = e.target.closest("[data-action]");
      if (btn) cleanup(btn.dataset.action === "confirm");
    });
  });
}

/* --------------------------------- Top nav ------------------------------------ */
// activeLabel lets each page decide which primary nav item (if any) is current.
function renderNavLinks(activeLabel = "Home") {
  const nav = document.getElementById("navLinks");
  if (!nav) return;
  nav.innerHTML = NAV_LINKS.map((label) => {
    const cls = label === activeLabel ? "active" : "";
    const href = NAV_LINK_HREFS[label];
    return href
      ? `<a class="${cls}" href="${href}">${label}</a>`
      : `<span class="${cls}">${label}</span>`;
  }).join("");
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
      return `<a class="nav-item nav-item--sell" data-tab="${n.id}" href="${n.href}" aria-label="${n.label}">
        <i data-lucide="${n.icon}"></i>
      </a>`;
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
