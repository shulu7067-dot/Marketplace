/* ============================================================================
   MARKA — static build (vanilla JS, no bundler/compiler required)
   Same "ledger & tag" visual identity as the original React version, ported
   to plain HTML/CSS/JS so GitHub Pages can serve it with zero build step.
   ============================================================================ */

const CATEGORIES = [
  { label: "Vehicles",       icon: "car",        color: "#2F5D62", bg: "#E4EEEE" },
  { label: "Bikes",          icon: "bike",        color: "#5B4B9A", bg: "#ECE8F6" },
  { label: "Property",       icon: "home",        color: "#C6841F", bg: "#F7E8CE" },
  { label: "Electronics",    icon: "monitor",     color: "#B0472D", bg: "#F6E2DC" },
  { label: "Phones",         icon: "smartphone",  color: "#1F8A4C", bg: "#DFF3E6" },
  { label: "All categories", icon: "grid-3x3",    color: "#16213E", bg: "#E7EAF2" },
];

const FEATURED = [
  { id: 1, title: "Coastal 4-bed family home", price: "$412,000", loc: "Riverside, NY", tag: "Property", boosted: true,  grad: ["#2F5D62", "#16213E"] },
  { id: 2, title: "'98 Land Cruiser, restored", price: "$18,500",  loc: "Queens, NY",   tag: "Vehicles", boosted: true,  grad: ["#C6841F", "#8A5A12"] },
  { id: 3, title: "Cannondale gravel bike",     price: "$1,150",   loc: "Brooklyn, NY", tag: "Bikes",    boosted: false, grad: ["#5B4B9A", "#2F5D62"] },
];

const LISTINGS = [
  { id: 1, title: "Trek Marlin 7 mountain bike", price: "$540",   loc: "Brooklyn, US", time: "2h", grad: ["#2F5D62", "#16213E"] },
  { id: 2, title: "2016 CEO fleet sedan",         price: "$8,002", loc: "New York, US", time: "4h", grad: ["#C6841F", "#8A5A12"] },
  { id: 3, title: "Restored '46 roadster",        price: "$8,999", loc: "New York, US", time: "6h", grad: ["#5B4B9A", "#2F5D62"] },
  { id: 4, title: "Dual 24in monitor setup",      price: "$1,020", loc: "New York, US", time: "9h", grad: ["#16213E", "#0D1730"] },
  { id: 5, title: "Modern 200m² family house",    price: "$9,541", loc: "New York, US", time: "1d", grad: ["#2F5D62", "#5B4B9A"] },
  { id: 6, title: "iPhone 14 Pro, unlocked",      price: "$690",   loc: "New York, US", time: "1d", grad: ["#B0472D", "#8A5A12"] },
];

const favs = {}; // id -> bool

function priceStub(price) {
  return `
    <div class="price-stub">
      <div class="inner"><span>${price}</span><span class="notch"></span></div>
    </div>`;
}

function favButton(id) {
  const active = !!favs[id];
  return `
    <button class="fav-btn ${active ? "active" : ""}" data-fav-id="${id}">
      <i data-lucide="heart"></i>
    </button>`;
}

function featuredCard(item) {
  return `
    <div class="card featured-card">
      <div class="card-media" style="background: linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})">
        ${item.boosted ? `<div class="boosted-badge"><i data-lucide="zap"></i> Boosted</div>` : ""}
        ${favButton(item.id)}
      </div>
      <div class="card-body">
        <div class="card-tag">${item.tag}</div>
        <div class="card-title">${item.title}</div>
        <div class="card-foot">${priceStub(item.price)}</div>
      </div>
    </div>`;
}

function listingCard(item) {
  const favId = item.id + 100;
  return `
    <div class="card">
      <div class="card-media" style="background: linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})">
        ${favButton(favId)}
      </div>
      <div class="card-body">
        <div class="card-title">${item.title}</div>
        <div class="card-loc"><i data-lucide="map-pin"></i><span>${item.loc}</span></div>
        <div class="card-foot">
          ${priceStub(item.price)}
          <span class="card-time">${item.time} ago</span>
        </div>
      </div>
    </div>`;
}

function categoryCard(c) {
  return `
    <div class="cat-card">
      <div class="cat-icon" style="background:${c.bg}"><i data-lucide="${c.icon}" style="color:${c.color}; width:19px; height:19px;"></i></div>
      <span>${c.label}</span>
    </div>`;
}

function render() {
  const root = document.getElementById("root");
  root.innerHTML = `
    <div class="wrap">

      <!-- Mobile / tablet top bar -->
      <div class="topbar-mobile">
        <button class="icon-btn"><i data-lucide="menu"></i></button>
        <div class="brand">
          <div class="brand-mark">M</div>
          <span class="brand-name">Marka</span>
        </div>
        <button class="icon-btn">
          <i data-lucide="bell"></i>
          <span class="notif-dot"></span>
        </button>
      </div>

      <!-- Desktop top nav -->
      <div class="topbar-desktop">
        <div class="brand">
          <div class="brand-mark">M</div>
          <span class="brand-name">Marka</span>
        </div>
        <div class="nav-links">
          <span class="active">Home</span>
          <span>Categories</span>
          <span>Blog</span>
          <span>Contact</span>
        </div>
        <div class="desktop-actions">
          <button class="icon-btn"><i data-lucide="bell"></i><span class="notif-dot"></span></button>
          <button class="post-ad-btn"><i data-lucide="plus" style="color:#C6841F"></i> Post ad</button>
          <div class="avatar">JD</div>
        </div>
      </div>

      <!-- Hero / search -->
      <div class="hero">
        <h1>Find your next great trade.</h1>
        <div class="search-row">
          <div class="search-field">
            <i data-lucide="search"></i>
            <input placeholder="Search bikes, homes, phones…" />
          </div>
          <button class="filter-btn"><i data-lucide="sliders-horizontal" style="color:#fff"></i></button>
        </div>
      </div>

      <!-- Categories -->
      <div class="section">
        <div class="section-head"><h2>Categories</h2></div>
        <div class="cat-grid">
          ${CATEGORIES.map(categoryCard).join("")}
        </div>
      </div>

      <!-- Promo banner -->
      <div class="section">
        <div class="promo">
          <div>
            <div class="promo-eyebrow">Sell faster</div>
            <div class="promo-title">Boost your ad to the top of search</div>
          </div>
          <button class="promo-arrow"><i data-lucide="arrow-right" style="color:#20140A"></i></button>
        </div>
      </div>

      <!-- Featured -->
      <div class="section">
        <div class="section-head">
          <h2>Featured</h2>
          <div class="show-all">Show all <i data-lucide="chevron-right"></i></div>
        </div>
        <div class="featured-row">
          ${FEATURED.map(featuredCard).join("")}
        </div>
      </div>

      <!-- Latest ads -->
      <div class="section listings-section">
        <div class="section-head">
          <h2>Latest ads</h2>
          <div class="show-all">Show all <i data-lucide="chevron-right"></i></div>
        </div>
        <div class="listings-grid">
          ${LISTINGS.map(listingCard).join("")}
        </div>
      </div>

      <!-- Bottom nav -->
      <div class="bottom-nav">
        <div class="bottom-nav-inner">
          <button class="nav-item active" data-tab="home"><i data-lucide="home"></i><span>Home</span></button>
          <button class="nav-item" data-tab="favorites"><i data-lucide="heart"></i><span>Favorites</span></button>
          <button class="nav-sell" data-tab="sell"><i data-lucide="plus"></i></button>
          <button class="nav-item" data-tab="search"><i data-lucide="search"></i><span>Search</span></button>
          <button class="nav-item" data-tab="profile"><i data-lucide="user"></i><span>Profile</span></button>
        </div>
      </div>

    </div>`;

  // Render lucide icons into the <i data-lucide="..."> placeholders
  lucide.createIcons();

  // Wire up favorite toggle buttons
  document.querySelectorAll("[data-fav-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fav-id");
      favs[id] = !favs[id];
      render();
    });
  });

  // Wire up bottom-nav tab switching
  document.querySelectorAll(".nav-item, .nav-sell").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      if (btn.classList.contains("nav-item")) btn.classList.add("active");
    });
  });
}

render();
