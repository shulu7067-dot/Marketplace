/* ============================================================================
   MARKA — Listing analytics store
   localStorage-backed event log (view / favorite / message / contact-click)
   per listing id, same pattern as js/favorites-store.js and
   js/recently-viewed-store.js. insights.html reads this to build the Insights
   dashboard (Profile > My Listings > Insights). Swap for real backend
   analytics once there's an API — every call site just calls
   recordListingEvent(), so nothing downstream needs to change.
   ============================================================================ */

const ANALYTICS_KEY = "marka_listing_analytics_v1";
const ANALYTICS_UPDATED_EVENT = "marka:analytics-updated";
const ANALYTICS_EVENT_TYPES = ["view", "favorite", "message", "contact"];

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function readAnalytics() {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAnalytics(data) {
  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(ANALYTICS_UPDATED_EVENT));
  } catch {
    // Storage full/unavailable — this is a local-only demo store, fail quietly.
  }
}

function blankListingAnalytics() {
  return { totals: { view: 0, favorite: 0, message: 0, contact: 0 }, daily: {} };
}

// One session (per browser tab lifetime) doesn't double-count repeat views of
// the same listing on rapid re-renders/navigations back and forth.
const viewedThisSession = new Set();

function recordListingEvent(listingId, type, opts = {}) {
  if (!listingId || !ANALYTICS_EVENT_TYPES.includes(type)) return;
  const id = String(listingId);

  if (type === "view" && !opts.allowRepeat) {
    if (viewedThisSession.has(id)) return;
    viewedThisSession.add(id);
  }

  const data = readAnalytics();
  if (!data[id]) data[id] = blankListingAnalytics();
  const entry = data[id];

  entry.totals[type] = (entry.totals[type] || 0) + 1;
  const day = todayKey();
  if (!entry.daily[day]) entry.daily[day] = { view: 0, favorite: 0, message: 0, contact: 0 };
  entry.daily[day][type] = (entry.daily[day][type] || 0) + 1;

  writeAnalytics(data);
}

function getListingAnalytics(listingId) {
  const data = readAnalytics();
  return data[String(listingId)] || blankListingAnalytics();
}

// Returns the last `days` days (oldest -> newest) as [{date, view, favorite,
// message, contact}], zero-filled so charts don't have to worry about gaps.
function getListingTimeseries(listingId, days = 14) {
  const entry = getListingAnalytics(listingId);
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const day = entry.daily[key] || { view: 0, favorite: 0, message: 0, contact: 0 };
    out.push({ date: key, ...day });
  }
  return out;
}

function getAllListingAnalytics() {
  return readAnalytics();
}

// Aggregate totals across every listing id in `ids` — used for the Insights
// overview cards (all of "my listings" combined).
function getAggregateAnalytics(ids) {
  const data = readAnalytics();
  const agg = { view: 0, favorite: 0, message: 0, contact: 0 };
  ids.forEach((id) => {
    const entry = data[String(id)];
    if (!entry) return;
    agg.view += entry.totals.view || 0;
    agg.favorite += entry.totals.favorite || 0;
    agg.message += entry.totals.message || 0;
    agg.contact += entry.totals.contact || 0;
  });
  return agg;
}

// Seeds believable historical numbers the first time a given listing is
// looked at in Insights, so the dashboard isn't empty/zero before a real
// visitor has generated any events in this browser — same idea as
// js/favorites-store.js's DEFAULT_FAVORITE_IDS seed. Deterministic per id so
// it doesn't reshuffle on every render.
function seedDemoAnalyticsIfEmpty(listingId, baselineViews = 40) {
  const id = String(listingId);
  const data = readAnalytics();
  if (data[id]) return; // real data already exists — never overwrite it
  const entry = blankListingAnalytics();
  let seed = Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0) || 1;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  let totalViews = 0,
    totalFav = 0,
    totalMsg = 0,
    totalContact = 0;
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const v = Math.round(rand() * (baselineViews / 6));
    const f = rand() > 0.75 ? Math.round(rand() * 2) : 0;
    const m = rand() > 0.8 ? 1 : 0;
    const c = rand() > 0.85 ? 1 : 0;
    entry.daily[key] = { view: v, favorite: f, message: m, contact: c };
    totalViews += v;
    totalFav += f;
    totalMsg += m;
    totalContact += c;
  }
  entry.totals = { view: totalViews, favorite: totalFav, message: totalMsg, contact: totalContact };
  data[id] = entry;
  writeAnalytics(data);
}
