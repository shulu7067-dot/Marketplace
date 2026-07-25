/* ============================================================================
   MARKA — Insights page logic
   Profile > My Listings > Insights. Combines the signed-in user's demo
   listings (js/profile-data.js MY_LISTING_IDS) with anything they've really
   posted from the Sell page (js/listings-store.js), the same merge pattern
   js/profile.js already uses for the My Listings tab — then reads
   js/analytics-store.js for the numbers behind each one.
   ============================================================================ */

const ENGAGEMENT_META = [
  { key: "view", label: "Views", icon: "eye" },
  { key: "favorite", label: "Favorites", icon: "heart" },
  { key: "message", label: "Messages", icon: "message-circle" },
  { key: "contact", label: "Calls / contact clicks", icon: "phone" },
];

function getMyListingRecords() {
  const demo = MY_LISTING_IDS.map((m) => ({ ...LISTING_DETAILS[m.id], status: m.status, isOwn: true }));
  const real = readUserListings().map(userListingToRecord);
  return [...real, ...demo];
}

function formatShortDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* --------------------------------- Renderers ------------------------------------ */
function renderOverview(records) {
  const ids = records.map((r) => r.id);
  const agg = getAggregateAnalytics(ids);
  const grid = document.getElementById("overviewStats");
  grid.innerHTML = [
    { icon: "eye", value: agg.view, label: "Total views" },
    { icon: "heart", value: agg.favorite, label: "Total favorites" },
    { icon: "message-circle", value: agg.message, label: "Messages received" },
    { icon: "phone", value: agg.contact, label: "Calls / contacts" },
  ]
    .map(
      (s) => `
    <div class="stat-card">
      <i data-lucide="${s.icon}"></i>
      <span class="stat-value">${s.value.toLocaleString()}</span>
      <span class="stat-label">${s.label}</span>
    </div>`
    )
    .join("");
}

function renderPicker(records, selectedId) {
  const select = document.getElementById("listingPicker");
  select.innerHTML = records.map((r) => `<option value="${r.id}">${r.title}</option>`).join("");
  select.value = selectedId;
}

function renderListingCard(record) {
  const el = document.getElementById("insightsListingCard");
  const meta = LISTING_STATUS_META[record.status] || null;
  el.innerHTML = `
    <div class="insights-listing-media" style="${cardMediaStyle(record)}"></div>
    <div class="insights-listing-body">
      <div class="insights-listing-title">${record.title}</div>
      <div class="insights-listing-meta">
        <span>${record.loc}</span>
        ${meta ? `<span class="status-pill status-pill--${record.status}">${meta.label}</span>` : ""}
      </div>
    </div>
    <a class="btn-secondary" href="listing.html?id=${record.id}"><i data-lucide="external-link"></i> View ad</a>`;
}

function renderListingStats(record) {
  const totals = getListingAnalytics(record.id).totals;
  const grid = document.getElementById("listingStats");
  grid.innerHTML = ENGAGEMENT_META.map(
    (m) => `
    <div class="stat-card">
      <i data-lucide="${m.icon}"></i>
      <span class="stat-value">${(totals[m.key] || 0).toLocaleString()}</span>
      <span class="stat-label">${m.label}</span>
    </div>`
  ).join("");
}

function renderChart(record) {
  const series = getListingTimeseries(record.id, 14);
  const max = Math.max(1, ...series.map((d) => d.view));
  const total = series.reduce((sum, d) => sum + d.view, 0);
  document.getElementById("chartTotal").textContent = `${total.toLocaleString()} views`;

  const todayKeyStr = todayKey();
  document.getElementById("viewsChart").innerHTML = series
    .map((d) => {
      const heightPct = Math.max(4, Math.round((d.view / max) * 100));
      const label = formatShortDate(d.date);
      return `
      <div class="chart-bar-col" data-today="${d.date === todayKeyStr}" title="${label}: ${d.view} view${d.view === 1 ? "" : "s"}">
        <div class="chart-bar" style="height:${heightPct}%"></div>
        <span class="chart-bar-label">${label.split(" ")[1]}</span>
      </div>`;
    })
    .join("");
}

function renderBreakdown(record) {
  const totals = getListingAnalytics(record.id).totals;
  const views = totals.view || 0;
  const el = document.getElementById("engagementBreakdown");
  el.innerHTML = ENGAGEMENT_META.filter((m) => m.key !== "view")
    .map((m) => {
      const count = totals[m.key] || 0;
      const pct = views > 0 ? Math.min(100, Math.round((count / views) * 100)) : 0;
      return `
      <div class="breakdown-row">
        <div class="breakdown-row-icon"><i data-lucide="${m.icon}"></i></div>
        <div class="breakdown-row-body">
          <div class="breakdown-row-top">
            <span>${m.label}</span>
            <strong>${count.toLocaleString()}${views ? ` · ${pct}% of views` : ""}</strong>
          </div>
          <div class="breakdown-bar-track"><div class="breakdown-bar-fill" style="width:${pct}%"></div></div>
        </div>
      </div>`;
    })
    .join("");
}

function renderDetail(records, id) {
  const record = records.find((r) => String(r.id) === String(id));
  if (!record) return;
  seedDemoAnalyticsIfEmpty(record.id, 45);
  renderListingCard(record);
  renderListingStats(record);
  renderChart(record);
  renderBreakdown(record);
  refreshIcons();
}

function renderAll() {
  renderNavLinks("");
  const records = getMyListingRecords();

  renderOverview(records);

  const empty = document.getElementById("insightsEmpty");
  const detail = document.getElementById("insightsDetail");
  const pickerWrap = document.getElementById("listingPicker");

  if (!records.length) {
    empty.hidden = false;
    detail.hidden = true;
    pickerWrap.hidden = true;
    refreshIcons();
    return;
  }

  empty.hidden = true;
  detail.hidden = false;
  pickerWrap.hidden = false;

  records.forEach((r) => seedDemoAnalyticsIfEmpty(r.id, 45));

  const requestedId = new URLSearchParams(window.location.search).get("id");
  const initialId = records.some((r) => String(r.id) === String(requestedId)) ? requestedId : records[0].id;

  renderPicker(records, initialId);
  renderDetail(records, initialId);
  refreshIcons();
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  renderBottomNav("profile");

  document.getElementById("listingPicker").addEventListener("change", (e) => {
    const records = getMyListingRecords();
    history.replaceState(null, "", `insights.html?id=${e.target.value}`);
    renderDetail(records, e.target.value);
  });

  window.addEventListener(ANALYTICS_UPDATED_EVENT, () => {
    const select = document.getElementById("listingPicker");
    const records = getMyListingRecords();
    renderOverview(records);
    if (select.value) renderDetail(records, select.value);
  });

  document.addEventListener("click", (e) => {
    const tabBtn = e.target.closest("[data-tab]");
    if (tabBtn) {
      renderBottomNav(tabBtn.dataset.tab);
      refreshIcons();
    }
  });
});

window.addEventListener("load", refreshIcons);
