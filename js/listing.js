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

const REPORT_REASONS = [
  "Prohibited item",
  "Suspected scam or fraud",
  "Spam or misleading",
  "Offensive content",
  "Other",
];

// Accepts both the numeric LISTING_DETAILS ids and the string ids ("u_...")
// used by the localStorage-backed user-listings store (js/listings-store.js).
function getRequestedId() {
  const raw = new URLSearchParams(window.location.search).get("id");
  if (!raw) return 1;
  const numId = Number(raw);
  if (!Number.isNaN(numId) && LISTING_DETAILS[numId]) return numId;
  if (getUserListing(raw)) return raw;
  return 1; // fall back to a known listing
}

function getRecordForId(id) {
  if (LISTING_DETAILS[id]) return LISTING_DETAILS[id];
  const stored = getUserListing(id);
  return stored ? userListingToRecord(stored) : LISTING_DETAILS[1];
}

// A single image entry is either a [c1, c2] gradient pair (demo data) or a
// data-URL string (a real uploaded photo from the sell form).
function mediaStyle(img) {
  if (Array.isArray(img)) return `background:linear-gradient(135deg, ${img[0]}, ${img[1]})`;
  return `background-image:url('${img}');background-size:cover;background-position:center;`;
}

function getSimilarListings(record) {
  const all = Object.values(LISTING_DETAILS).filter((l) => l.id !== record.id && !isUserBlocked(l.seller.name));
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

  main.setAttribute("style", mediaStyle(record.images[state.activeImage]));
  main.innerHTML = favButtonHTML(record.id, !!state.favs[record.id]);

  thumbs.innerHTML = record.images
    .map((img, i) => `
      <button class="gallery-thumb ${i === state.activeImage ? "active" : ""}" data-thumb-index="${i}" aria-label="Photo ${i + 1}"
        style="${mediaStyle(img)}"></button>`)
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
        ${!record.isOwn && isUserBlocked(s.name) ? `<span class="blocked-tag"><i data-lucide="user-x"></i> Blocked</span>` : ""}
      </div>
      <div class="seller-meta">
        <span class="seller-rating"><i data-lucide="star"></i> ${s.rating.toFixed(1)}</span>
        <span>${s.deals} deals</span>
        <span>Member since ${s.memberSince}</span>
      </div>
    </div>`;
}

// Buyer view (message/call/share/report) vs. owner view (edit/delete) —
// swapped based on whether the record came from the user-listings store.
function renderActionArea(record) {
  const wrap = document.getElementById("listingActionsWrap");
  if (record.isOwn) {
    wrap.innerHTML = `
      <div class="owner-banner">
        <i data-lucide="info"></i>
        This is your listing${record.status === "draft" ? " — it's a draft and isn't visible to buyers yet." : "."}
      </div>
      <div class="action-buttons">
        <a class="btn-primary" href="sell.html?edit=${record.id}">
          <i data-lucide="pencil"></i> Edit listing
        </a>
        <button class="btn-secondary" id="deleteListingBtn" type="button">
          <i data-lucide="trash-2"></i> Delete listing
        </button>
      </div>`;
    return;
  }

  const blocked = isUserBlocked(record.seller.name);

  wrap.innerHTML = `
    ${blocked ? `<div class="owner-banner owner-banner--warning"><i data-lucide="user-x"></i> You've blocked ${record.seller.name}. Unblock them to message or call.</div>` : ""}
    <div class="action-buttons">
      <a class="btn-primary ${blocked ? "btn-disabled" : ""}" id="messageSellerBtn" href="messages.html" ${blocked ? 'aria-disabled="true" tabindex="-1"' : ""}>
        <i data-lucide="message-circle"></i> Message Seller
      </a>
      <a class="btn-secondary ${blocked ? "btn-disabled" : ""}" id="callSellerBtn" href="tel:${record.seller.phone.replace(/[^+\d]/g, "")}" ${blocked ? 'aria-disabled="true" tabindex="-1"' : ""}>
        <i data-lucide="phone"></i> Call Seller
      </a>
    </div>
    <button class="btn-share" id="shareListingBtn" type="button">
      <i data-lucide="share-2"></i> Share Listing
    </button>
    <button class="btn-share btn-report" id="reportListingBtn" type="button">
      <i data-lucide="flag"></i> Report listing
    </button>
    <button class="btn-share ${blocked ? "" : "btn-report"}" id="blockSellerBtn" type="button">
      <i data-lucide="${blocked ? "user-check" : "user-x"}"></i> ${blocked ? "Unblock user" : "Block user"}
    </button>`;

  if (blocked) return;

  // Reuse an existing thread for this listing, or open a new one, then send
  // straight to it — same idea as js/listings-store.js's findOrCreate pattern.
  if (typeof findOrCreateConversation === "function") {
    const firstImage = record.images && record.images[0];
    const convId = findOrCreateConversation({
      listingId: record.id,
      listingTitle: record.title,
      listingPrice: record.price,
      listingGrad: Array.isArray(firstImage) ? firstImage : null,
      listingImage: typeof firstImage === "string" ? firstImage : null,
      seller: { name: record.seller.name, initials: record.seller.initials, online: false },
    });
    document.getElementById("messageSellerBtn").href = `messages.html?c=${convId}`;
  }
}

function renderReportReasons() {
  const list = document.getElementById("reportReasonList");
  if (!list) return;
  list.innerHTML = REPORT_REASONS.map(
    (reason, i) => `
    <label class="radio-option">
      <input type="radio" name="reportReason" value="${reason}" ${i === 0 ? "checked" : ""} />
      <span>${reason}</span>
    </label>`
  ).join("");
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
  renderActionArea(record);
  renderReportReasons();
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

function openReportModal() {
  document.getElementById("reportModal").classList.add("open");
}

function closeReportModal() {
  document.getElementById("reportModal").classList.remove("open");
}

function submitReport() {
  closeReportModal();
  document.getElementById("reportDetails").value = "";
  const btn = document.getElementById("reportListingBtn");
  if (!btn) return;
  const original = btn.innerHTML;
  btn.innerHTML = `<i data-lucide="check"></i> Reported — thank you`;
  refreshIcons();
  setTimeout(() => {
    btn.innerHTML = original;
    refreshIcons();
  }, 2200);
}

async function handleDeleteOwnListing(record) {
  const confirmed = await confirmModal({
    title: "Delete this listing?",
    message: "This will permanently remove your listing. This action can't be undone.",
    confirmLabel: "Delete",
    danger: true,
  });
  if (!confirmed) return;
  deleteUserListing(record.id);
  window.location.href = "profile.html";
}

async function handleToggleBlockSeller(record) {
  const seller = record.seller;
  const alreadyBlocked = isUserBlocked(seller.name);
  const confirmed = await confirmModal({
    title: alreadyBlocked ? "Unblock this user?" : "Block this user?",
    message: alreadyBlocked
      ? `${seller.name} will be able to message you and their listings will show up again.`
      : `You won't be able to message or call ${seller.name}, and their listings will be hidden from browse and search. You can undo this any time from Profile > Settings > Blocked users.`,
    confirmLabel: alreadyBlocked ? "Unblock" : "Block",
    danger: !alreadyBlocked,
  });
  if (!confirmed) return;

  if (alreadyBlocked) unblockUser(seller.name);
  else blockUser(seller);

  renderSeller(record);
  renderActionArea(record);
  renderSimilar(record);
  refreshIcons();
}

document.addEventListener("DOMContentLoaded", () => {
  const record = getRecordForId(getRequestedId());
  renderAll(record);
  if (!record.isOwn && typeof recordListingView === "function") recordListingView(record.id);

  document.addEventListener("click", (e) => {
    const disabledAction = e.target.closest(".btn-disabled");
    if (disabledAction) {
      e.preventDefault();
      return;
    }

    const thumb = e.target.closest("[data-thumb-index]");
    if (thumb) {
      state.activeImage = Number(thumb.dataset.thumbIndex);
      renderGallery(record);
      refreshIcons();
      return;
    }

    const favBtn = e.target.closest("[data-fav-id]");
    if (favBtn) {
      toggleFav(favBtn.dataset.favId, record);
      return;
    }

    const tabBtn = e.target.closest("[data-tab]");
    if (tabBtn) {
      renderBottomNav(tabBtn.dataset.tab);
      refreshIcons();
      return;
    }

    if (e.target.closest("#shareListingBtn")) {
      shareListing(record);
      return;
    }

    if (e.target.closest("#reportListingBtn")) {
      openReportModal();
      return;
    }

    if (e.target.closest("#blockSellerBtn")) {
      handleToggleBlockSeller(record);
      return;
    }

    if (e.target.closest("#deleteListingBtn")) {
      handleDeleteOwnListing(record);
      return;
    }

    if (e.target.closest("#reportSubmitBtn")) {
      submitReport();
      return;
    }

    if (e.target.closest("#reportCancelBtn") || e.target.closest("#reportModalClose")) {
      closeReportModal();
      return;
    }

    if (e.target.id === "reportModal") {
      closeReportModal();
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
