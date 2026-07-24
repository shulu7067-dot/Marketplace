/* ============================================================================
   MARKA — Listing page logic
   Reads ?id= from the URL, looks it up in LISTING_DETAILS (js/listing-data.js),
   and renders the gallery, header, seller card, specs and similar listings.
   Shares NAV_LINKS / BOTTOM_NAV / priceStub() / favButtonHTML() / refreshIcons()
   with the home page via js/common.js.
   ============================================================================ */

const state = {
  activeImage: 0,
  favs: {}, // local favorite state for this page (fav button on the gallery + similar-listings cards)
};

function getRequestedId() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("id"));
  return LISTING_DETAILS[id] ? id : 1; // fall back to a known listing
}

function getSimilarListings(record) {
  const all = Object.values(LISTING_DETAILS).filter((l) => l.id !== record.id);
  const sameTag = all.filter((l) => l.tag === record.tag);
  const rest = all.filter((l) => l.tag !== record.tag);
  return [...sameTag, ...rest].slice(0, 4);
}

/* --------------------------------- Renderers ---------------------------------- */
function renderBreadcrumb(record) {
  const el = document.getElementById("breadcrumb");
  el.innerHTML = `
    <a href="index.html">Home</a>
    <i data-lucide="chevron-right"></i>
    <a href="index.html">${record.tag}</a>
    <i data-lucide="chevron-right"></i>
    <span aria-current="page">${record.title}</span>`;
}

function renderGallery(record) {
  const main = document.getElementById("galleryMain");
  const thumbs = document.getElementById("galleryThumbs");

  const [c1, c2] = record.images[state.activeImage];
  main.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
  main.innerHTML = favButtonHTML(record.id, !!state.favs[record.id]);

  thumbs.innerHTML = record.images
    .map((img, i) => `
      <button class="gallery-thumb ${i === state.activeImage ? "active" : ""}" data-thumb-index="${i}" aria-label="Photo ${i + 1}"
        style="background:linear-gradient(135deg, ${img[0]}, ${img[1]})"></button>`)
    .join("");
}

function renderHeader(record) {
  document.getElementById("listingTitle").textContent = record.title;
  document.getElementById("listingPrice").innerHTML = priceStub(record.price);
  document.getElementById("listingLoc").textContent = record.loc;
  document.getElementById("listingDate").textContent = record.datePosted;
  document.getElementById("listingCondition").textContent = record.condition;
  document.title = `${record.title} — Marka`;
}

function renderSeller(record) {
  const s = record.seller;
  document.getElementById("sellerCard").innerHTML = `
    <div class="seller-avatar">${s.initials}</div>
    <div class="seller-info">
      <div class="seller-name-row">
        <span class="seller-name">${s.name}</span>
        ${s.verified ? `<span class="verified-tag"><i data-lucide="badge-check"></i> Verified</span>` : ""}
      </div>
      <div class="seller-meta">
        <span class="seller-rating"><i data-lucide="star"></i> ${s.rating.toFixed(1)}</span>
        <span>${s.deals} deals</span>
        <span>Member since ${s.memberSince}</span>
      </div>
    </div>`;

  document.getElementById("messageSellerBtn").href = `mailto:${s.email}?subject=${encodeURIComponent(record.title)}`;
  document.getElementById("callSellerBtn").href = `tel:${s.phone.replace(/[^+\d]/g, "")}`;
}

function renderDescription(record) {
  const el = document.getElementById("listingDescription");
  el.innerHTML = record.description
    .split("\n\n")
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function renderSpecs(record) {
  const grid = document.getElementById("specsGrid");
  grid.innerHTML = record.specs
    .map((s) => `
      <div class="spec-row">
        <span class="spec-label">${s.label}</span>
        <span class="spec-value">${s.value}</span>
      </div>`)
    .join("");
}

function renderSafetyTips() {
  const list = document.getElementById("safetyList");
  list.innerHTML = SAFETY_TIPS.map((tip) => `<li><i data-lucide="check"></i> ${tip}</li>`).join("");
}

function renderSimilar(record) {
  const row = document.getElementById("similarRow");
  const items = getSimilarListings(record);
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
          <span class="card-time">${item.condition}</span>
        </div>
      </div>
    </div>`
    )
    .join("");
}

function renderAll(record) {
  renderNavLinks(""); // no primary nav item is "current" on a listing page
  renderBreadcrumb(record);
  renderGallery(record);
  renderHeader(record);
  renderSeller(record);
  renderDescription(record);
  renderSpecs(record);
  renderSafetyTips();
  renderSimilar(record);
  renderBottomNav("home");
  refreshIcons();
}

/* --------------------------------- Events ------------------------------------- */
function toggleFav(id, record) {
  state.favs[id] = !state.favs[id];
  renderGallery(record);
  renderSimilar(record);
  refreshIcons();
}

function shareListing(record) {
  const shareData = {
    title: `${record.title} — Marka`,
    text: `Check out this listing on Marka: ${record.title} (${record.price})`,
    url: window.location.href,
  };
  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
    return;
  }
  navigator.clipboard?.writeText(shareData.url).then(() => {
    const btn = document.getElementById("shareListingBtn");
    const original = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="check"></i> Link copied`;
    refreshIcons();
    setTimeout(() => {
      btn.innerHTML = original;
      refreshIcons();
    }, 1800);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const record = LISTING_DETAILS[getRequestedId()];
  renderAll(record);

  document.getElementById("shareListingBtn").addEventListener("click", () => shareListing(record));

  document.addEventListener("click", (e) => {
    const thumb = e.target.closest("[data-thumb-index]");
    if (thumb) {
      state.activeImage = Number(thumb.dataset.thumbIndex);
      renderGallery(record);
      refreshIcons();
      return;
    }

    const favBtn = e.target.closest("[data-fav-id]");
    if (favBtn) {
      toggleFav(Number(favBtn.dataset.favId), record);
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
});

window.addEventListener("load", refreshIcons);
