/* ============================================================================
   MARKA — Promotions (ad boost) store
   Backs the "Promote" flow (promote.html) that turns one of the signed-in
   user's own ads into a Boosted listing for a fixed number of days — the
   same idea the demo Featured cards already show via `boosted: true`
   (js/script.js) and the .boosted-badge style (css/style.css), just applied
   to real user ads instead of hard-coded seed data. Persisted to
   localStorage — same pattern as js/blocked-users-store.js.
   ============================================================================ */

const PROMOTIONS_KEY = "marka_promotions_v1";
const PROMOTIONS_UPDATED_EVENT = "marka:promotions-updated";

const PROMOTE_PLANS = [
  {
    key: "bump",
    label: "Quick Bump",
    durationDays: 3,
    price: 4.99,
    tagline: "A short push to the top of results",
    features: ["Jumps to the top of search & category results", "Runs for 3 days"],
  },
  {
    key: "featured",
    label: "Featured",
    durationDays: 7,
    price: 9.99,
    tagline: "Stand out everywhere your ad appears",
    badge: "Most popular",
    features: [
      "\"Boosted\" tag on your ad for 7 days",
      "Top placement in search & category results",
      "Featured row on the home page",
      "~3× more views on average",
    ],
  },
  {
    key: "top",
    label: "Top Ad",
    durationDays: 14,
    price: 16.99,
    tagline: "Maximum visibility for high-value items",
    features: [
      "Everything in Featured, for a full 14 days",
      "Pinned to the very top of your category",
      "Priority placement in browse results",
      "Highlighted border wherever it's shown",
    ],
  },
];

function getPromotePlan(key) {
  return PROMOTE_PLANS.find((p) => p.key === key) || null;
}

function notifyPromotionsUpdated() {
  window.dispatchEvent(new CustomEvent(PROMOTIONS_UPDATED_EVENT));
}

/* --------------------------------- Read / write -------------------------------- */
function readPromotions() {
  try {
    const raw = localStorage.getItem(PROMOTIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writePromotions(map) {
  try {
    localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(map));
  } catch {
    // Storage full/unavailable — this is a local-only demo store, fail quietly.
  }
}

/* --------------------------------- Public API ----------------------------------- */
// Returns { planKey, startedAt, expiresAt } for a still-active boost, or null
// if the ad was never boosted or its boost has expired.
function getPromotion(id) {
  const promo = readPromotions()[String(id)];
  if (!promo) return null;
  if (new Date(promo.expiresAt).getTime() <= Date.now()) return null;
  return promo;
}

function isPromoted(id) {
  return !!getPromotion(id);
}

function promoteListing(id, planKey) {
  const plan = getPromotePlan(planKey);
  if (!plan) return null;
  const map = readPromotions();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  const record = { planKey, startedAt: now.toISOString(), expiresAt: expiresAt.toISOString() };
  map[String(id)] = record;
  writePromotions(map);
  notifyPromotionsUpdated();
  return record;
}

function removePromotion(id) {
  const map = readPromotions();
  delete map[String(id)];
  writePromotions(map);
  notifyPromotionsUpdated();
}
