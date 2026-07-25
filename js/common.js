/* ============================================================================
   MARKA — Shared utilities
   Loaded on every page, before the page's own script. Holds the bits that are
   identical across the whole site: primary nav labels, bottom nav items, and
   the small render helpers (price stub, favorite button, icon refresh) that
   every card — home page or listing page — is built from.
   ============================================================================ */

const NAV_LINKS = ["Home", "Categories", "Blog", "Contact"];
const NAV_LINK_HREFS = { Home: "index.html", Categories: "categories.html", Blog: "blog.html", Contact: "contact.html" };
const NAV_LINK_ICONS = { Home: "home", Categories: "grid-3x3", Blog: "newspaper", Contact: "mail" };

const BOTTOM_NAV = [
  { id: "home", label: "Home", icon: "home", href: "index.html" },
  { id: "favorites", label: "Favorites", icon: "heart", href: "favorites.html" },
  { id: "sell", label: "Sell", icon: "plus", isSell: true, href: "sell.html" },
  { id: "messages", label: "Chat", icon: "message-circle", href: "messages.html" },
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
    const favCount = n.id === "favorites" && typeof getFavoriteCount === "function" ? getFavoriteCount() : 0;
    const badge =
      n.id === "messages" && typeof getTotalUnreadCount === "function" && getTotalUnreadCount() > 0
        ? `<span class="nav-badge" style="position:absolute;top:0;right:6px;">${getTotalUnreadCount()}</span>`
        : favCount > 0
        ? `<span class="nav-badge" style="position:absolute;top:0;right:6px;">${favCount}</span>`
        : "";
    return `<${tag} class="nav-item ${active ? "active" : ""}" data-tab="${n.id}" ${hrefAttr} style="position:relative;">
      <i data-lucide="${n.icon}" ${active && n.id === "favorites" ? 'style="fill:currentColor"' : ""}></i>
      <span>${n.label}</span>
      ${badge}
    </${tag}>`;
  }).join("");
  nav.innerHTML = "";
  nav.appendChild(inner);
  applyMessagesTopbarBadge();
}

/* --------------------------- Messages topbar icon-btn --------------------------- */
// The desktop topbar has its own "Message Seller" quick-access icon (next to
// Notifications) — every page that includes it renders <button id="messagesBtn">.
// This toggles its unread dot; safe to call even if messages-store.js or the
// button itself isn't present on a given page.
function applyMessagesTopbarBadge() {
  const btn = document.getElementById("messagesBtn");
  if (!btn) return;
  const unread = typeof getTotalUnreadCount === "function" ? getTotalUnreadCount() : 0;
  btn.classList.toggle("icon-btn--dot", unread > 0);
}

/* -------------------------- Notifications topbar bell icon ---------------------- */
// The bell icon in both the mobile and desktop topbars (marked with
// data-notif-bell) links to notifications.html and shows a live unread dot,
// same idea as applyMessagesTopbarBadge above. Safe to call even if
// notifications-store.js isn't loaded on a given page.
function applyNotificationsTopbarBadge() {
  const bells = document.querySelectorAll("[data-notif-bell]");
  if (!bells.length) return;
  const unread = typeof getTotalUnreadNotificationsCount === "function" ? getTotalUnreadNotificationsCount() : 0;
  bells.forEach((bell) => bell.classList.toggle("icon-btn--dot", unread > 0));
}

if (typeof window !== "undefined") {
  window.addEventListener("marka:messages-updated", applyMessagesTopbarBadge);
  window.addEventListener("marka:notifications-updated", applyNotificationsTopbarBadge);
  document.addEventListener("DOMContentLoaded", applyMessagesTopbarBadge);
  document.addEventListener("DOMContentLoaded", applyNotificationsTopbarBadge);
}

/* ------------------------------ Mobile nav drawer -------------------------------
   Every page's mobile/tablet topbar has a #menuBtn hamburger (hidden by CSS on
   desktop, where nav-links + topbar-actions already cover the same ground).
   Rather than duplicate a drawer's markup on every page, it's built once here,
   lazily, the first time #menuBtn is clicked. It mirrors the primary nav
   (NAV_LINKS) plus quick links to the pages the bottom nav already covers, so
   everything reachable elsewhere on the site is one tap away. ---------------- */
const DRAWER_QUICK_LINKS = [
  { label: "Favorites", icon: "heart", href: "favorites.html", key: "favorites" },
  { label: "Messages", icon: "message-circle", href: "messages.html", key: "messages" },
  { label: "Notifications", icon: "bell", href: "notifications.html", key: "notifications" },
  { label: "Post an ad", icon: "plus", href: "sell.html", key: "sell" },
  { label: "Your profile", icon: "user", href: "profile.html", key: "profile" },
];

function currentPageFile() {
  const path = window.location.pathname.split("/").pop();
  return path === "" ? "index.html" : path;
}

function drawerQuickLinkCount(key) {
  if (key === "favorites" && typeof getFavoriteCount === "function") return getFavoriteCount();
  if (key === "messages" && typeof getTotalUnreadCount === "function") return getTotalUnreadCount();
  if (key === "notifications" && typeof getTotalUnreadNotificationsCount === "function") return getTotalUnreadNotificationsCount();
  return 0;
}

function closeNavDrawer() {
  const overlay = document.getElementById("navDrawerOverlay");
  if (!overlay) return;
  overlay.classList.remove("open");
  document.body.classList.remove("drawer-open");
}

function buildNavDrawer() {
  if (document.getElementById("navDrawerOverlay")) return;
  const current = currentPageFile();

  const overlay = document.createElement("div");
  overlay.className = "drawer-overlay";
  overlay.id = "navDrawerOverlay";
  overlay.innerHTML = `
    <nav class="nav-drawer" role="dialog" aria-modal="true" aria-label="Main menu">
      <div class="drawer-head">
        <div class="brand">
          <span class="brand-mark">M</span>
          <span class="brand-name">Marka</span>
        </div>
        <button type="button" class="icon-btn" id="drawerCloseBtn" aria-label="Close menu">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="drawer-links">
        ${NAV_LINKS.map((label) => {
          const href = NAV_LINK_HREFS[label] || "#";
          const active = href === current;
          return `<a class="drawer-link ${active ? "active" : ""}" href="${href}">
            <i data-lucide="${NAV_LINK_ICONS[label] || "circle"}"></i>
            <span>${label}</span>
          </a>`;
        }).join("")}
      </div>
      <div class="drawer-divider"></div>
      <div class="drawer-links">
        ${DRAWER_QUICK_LINKS.map((n) => {
          const active = n.href === current;
          const count = drawerQuickLinkCount(n.key);
          return `<a class="drawer-link ${active ? "active" : ""}" href="${n.href}">
            <i data-lucide="${n.icon}"></i>
            <span>${n.label}</span>
            ${count > 0 ? `<span class="drawer-badge">${count}</span>` : ""}
          </a>`;
        }).join("")}
      </div>
      <div class="drawer-footer">© Marka — a demo marketplace</div>
    </nav>`;
  document.body.appendChild(overlay);
  refreshIcons();

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeNavDrawer();
  });
  document.getElementById("drawerCloseBtn").addEventListener("click", closeNavDrawer);
}

function openNavDrawer() {
  buildNavDrawer();
  const overlay = document.getElementById("navDrawerOverlay");
  document.body.classList.add("drawer-open");
  requestAnimationFrame(() => overlay.classList.add("open"));
}

if (typeof window !== "undefined") {
  document.addEventListener("click", (e) => {
    if (e.target.closest("#menuBtn")) openNavDrawer();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNavDrawer();
  });
}
