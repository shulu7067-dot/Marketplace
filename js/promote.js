/* ============================================================================
   MARKA — Promote (boost) ad page logic
   Reads ?id= off the URL, resolves it to one of the signed-in user's own
   active ads (a demo entry from MY_LISTING_IDS/js/profile-data.js, or a real
   posted ad from js/listings-store.js), and lets them buy a boost plan
   (js/promotions-store.js). Shares NAV_LINKS / BOTTOM_NAV / confirmModal() /
   refreshIcons() with the rest of the site via js/common.js.
   ============================================================================ */

const state = {
  id: null,
  record: null,
  status: null,
  selectedPlan: "featured",
};

function getRequestedId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// Resolves ?id= to { record, status } for one of *this user's own* ads —
// checks the seeded demo listings (MY_LISTING_IDS) first, then anything
// really posted from the Sell page. Returns null if the id doesn't belong to
// the user's own ads at all.
async function resolveOwnListing(id) {
  const demoMatch = MY_LISTING_IDS.find((m) => String(m.id) === String(id));
  if (demoMatch) return { record: LISTING_DETAILS[demoMatch.id], status: demoMatch.status };

  const owned = typeof getUserListing === "function" ? await getUserListing(id) : null;
  if (owned) {
    const seller = await getSellerInfo(owned.userId);
    return { record: userListingToRecord(owned, seller), status: owned.status };
  }

  return null;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/* --------------------------------- Renderers ---------------------------------- */
function renderEmpty(title, text) {
  document.getElementById("promoteForm").hidden = true;
  document.getElementById("promoteSuccess").hidden = true;
  document.getElementById("promoteEmptyTitle").textContent = title;
  document.getElementById("promoteEmptyText").textContent = text;
  document.getElementById("promoteEmpty").hidden = false;
}

function renderListingPreview(record) {
  document.getElementById("promoteListingPreview").innerHTML = `
    <div class="promote-listing-media" style="${cardMediaStyle(record)}"></div>
    <div class="promote-listing-body">
      <div class="promote-listing-title">${record.title}</div>
      <div class="promote-listing-meta">
        <span class="promote-listing-price">${formatPrice(record.price)}</span>
        <span>·</span>
        <span>${record.loc}</span>
      </div>
    </div>`;
}

function renderCurrentPanel() {
  const panel = document.getElementById("promoteCurrentPanel");
  const promo = getPromotion(state.id);
  if (!promo) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }
  const plan = getPromotePlan(promo.planKey);
  panel.hidden = false;
  panel.innerHTML = `
    <i data-lucide="zap"></i>
    <div class="promote-current-body">
      <div class="promote-current-title">Currently boosted — ${plan ? plan.label : "Active"}</div>
      <div class="promote-current-text">Runs until ${formatDate(promo.expiresAt)}. Pick a plan below to replace it, or remove the boost.</div>
    </div>
    <button type="button" class="btn-secondary" id="removeBoostBtn">
      <i data-lucide="x"></i> Remove boost
    </button>`;
  refreshIcons();
}

function planCardHTML(plan) {
  const selected = state.selectedPlan === plan.key;
  return `
    <div class="plan-card ${selected ? "selected" : ""}" data-plan-key="${plan.key}" role="radio" aria-checked="${selected}" tabindex="0">
      ${plan.badge ? `<span class="plan-card-badge">${plan.badge}</span>` : ""}
      <div class="plan-card-head">
        <div>
          <div class="plan-name">${plan.label}</div>
          <div class="plan-tagline">${plan.tagline}</div>
        </div>
        <span class="plan-radio-dot"><i data-lucide="check"></i></span>
      </div>
      <div class="plan-price-row">
        <span class="plan-price">${formatPrice(plan.price)}</span>
        <span class="plan-duration">/ ${plan.durationDays} days</span>
      </div>
      <ul class="plan-features">
        ${plan.features.map((f) => `<li><i data-lucide="check-circle"></i>${f}</li>`).join("")}
      </ul>
    </div>`;
}

function renderPlans() {
  document.getElementById("planGrid").innerHTML = PROMOTE_PLANS.map(planCardHTML).join("");
  renderSummary();
  refreshIcons();
}

function renderSummary() {
  const plan = getPromotePlan(state.selectedPlan);
  if (!plan) return;
  document.getElementById("promoteSummaryLabel").textContent = `${plan.label} · ${plan.durationDays}-day boost`;
  document.getElementById("promoteSummaryTotal").textContent = formatPrice(plan.price);
}

function renderSuccess(promo) {
  const plan = getPromotePlan(promo.planKey);
  document.getElementById("promoteForm").hidden = true;
  document.getElementById("promoteSuccess").hidden = false;
  document.getElementById("promoteSuccessText").textContent =
    `${state.record.title} is boosted with ${plan.label} through ${formatDate(promo.expiresAt)}. It'll show the Boosted tag and get priority placement across the site until then.`;
  document.getElementById("promoteViewListingBtn").href = `listing.html?id=${state.id}`;
  refreshIcons();
}

async function renderAll() {
  renderNavLinks("");

  const resolved = await resolveOwnListing(state.id);
  if (!resolved || !resolved.record) {
    renderEmpty("Ad not found", "We couldn't find that ad among your listings. Head back to your profile and pick one from My Listings.");
    refreshIcons();
    return;
  }
  if (resolved.status !== "published") {
    renderEmpty(
      "Only active ads can be promoted",
      "This ad isn't currently active, so it can't be boosted right now. Publish it (or wait for a pending sale to clear) and try again from My Listings."
    );
    refreshIcons();
    return;
  }

  state.record = resolved.record;
  state.status = resolved.status;

  document.getElementById("promoteEmpty").hidden = true;
  document.getElementById("promoteSuccess").hidden = true;
  document.getElementById("promoteForm").hidden = false;

  renderListingPreview(state.record);
  renderCurrentPanel();
  renderPlans();
  refreshIcons();
}

/* --------------------------------- Events ------------------------------------- */
async function handleRemoveBoost() {
  const confirmed = await confirmModal({
    title: "Remove this boost?",
    message: "Your ad will keep running as a normal listing, but it'll lose its Boosted placement right away.",
    confirmLabel: "Remove boost",
    danger: true,
  });
  if (!confirmed) return;
  removePromotion(state.id);
  renderCurrentPanel();
}

function handlePromote() {
  const btn = document.getElementById("promoteSubmitBtn");
  const label = document.getElementById("promoteSubmitLabel");
  btn.disabled = true;
  label.textContent = "Processing…";
  setTimeout(() => {
    const promo = promoteListing(state.id, state.selectedPlan);
    btn.disabled = false;
    label.textContent = "Promote this ad";
    if (promo) renderSuccess(promo);
  }, 500);
}

document.addEventListener("click", (e) => {
  const planCard = e.target.closest("[data-plan-key]");
  if (planCard) {
    state.selectedPlan = planCard.dataset.planKey;
    renderPlans();
    return;
  }

  if (e.target.closest("#promoteSubmitBtn")) {
    handlePromote();
    return;
  }

  if (e.target.closest("#removeBoostBtn")) {
    handleRemoveBoost();
    return;
  }

  const tabBtn = e.target.closest("[data-tab]");
  if (tabBtn) {
    renderBottomNav(tabBtn.dataset.tab);
    refreshIcons();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const planCard = e.target.closest("[data-plan-key]");
  if (!planCard) return;
  e.preventDefault();
  state.selectedPlan = planCard.dataset.planKey;
  renderPlans();
});

document.addEventListener("DOMContentLoaded", () => {
  state.id = getRequestedId();
  renderAll();
  renderBottomNav("");
  refreshIcons();
});
