/* ============================================================================
   MARKA — User-created listings store
   Everything created on the Sell page (drafts + published ads) is persisted
   to localStorage, since this build has no backend. These use their own
   string ids ("u_...") so they never collide with the numeric LISTING_DETAILS
   ids in js/listing-data.js. listing.js / profile.js render either dataset
   through the same card/detail markup by converting stored items with
   userListingToRecord() below.
   ============================================================================ */

const USER_LISTINGS_KEY = "marka_user_listings_v1";

// Every status a listing can be in, in the order they should appear as tabs
// on the profile page. "published" is surfaced to the user as "Active" —
// the stored value stays "published" so it keeps matching sell.js / older
// records; everything else is stored under its own display name.
const LISTING_STATUSES = ["published", "pending", "sold", "expired", "draft"];
const LISTING_STATUS_META = {
  published: { label: "Active", emptyText: "Ads you post will show up here once they're live." },
  pending: { label: "Pending", emptyText: "Ads awaiting buyer pickup or payment show up here." },
  sold: { label: "Sold", emptyText: "Ads you've marked as sold show up here." },
  expired: { label: "Expired", emptyText: "Ads that ran past their listing period show up here." },
  draft: { label: "Drafts", emptyText: "Unfinished ads you've started but not posted yet." },
};

// Stand-in for the signed-in user until there's a real account system.
// Mirrors js/profile-data.js's PROFILE so "your" listings read consistently
// everywhere, without making listing.html / sell.html depend on load order.
const CURRENT_USER = {
  name: "Jordan Diaz",
  initials: "JD",
  memberSince: "2021",
  rating: 4.9,
  verified: true,
  phone: "+1 (555) 201-9042",
  email: "jordan.diaz@example.com",
};

const GRAD_PALETTE = [
  ["#2F5D62", "#16213E"],
  ["#C6841F", "#8A5A12"],
  ["#5B4B9A", "#2F5D62"],
  ["#16213E", "#0D1730"],
  ["#B0472D", "#8A5A12"],
  ["#2F5D62", "#5B4B9A"],
];

function gradFromId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return GRAD_PALETTE[hash % GRAD_PALETTE.length];
}

function newListingId() {
  return `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* -------------------------------- Read / write -------------------------------- */
function readUserListings() {
  try {
    const raw = localStorage.getItem(USER_LISTINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeUserListings(list) {
  try {
    localStorage.setItem(USER_LISTINGS_KEY, JSON.stringify(list));
  } catch {
    // Storage full/unavailable — this is a local-only demo store, fail quietly.
  }
}

function getUserListing(id) {
  return readUserListings().find((l) => l.id === id) || null;
}

function getUserListingsByStatus(status) {
  return readUserListings()
    .filter((l) => l.status === status)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function saveUserListing(data) {
  const list = readUserListings();
  const now = new Date().toISOString();
  const id = data.id || newListingId();
  const idx = list.findIndex((l) => l.id === id);
  const existing = idx >= 0 ? list[idx] : null;
  const record = {
    ...existing,
    ...data,
    id,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  writeUserListings(list);
  return record;
}

function deleteUserListing(id) {
  writeUserListings(readUserListings().filter((l) => l.id !== id));
}

/* ------------------------------- Render helpers -------------------------------- */
function timeAgo(iso) {
  if (!iso) return "just now";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Converts a stored user listing into the same shape as LISTING_DETAILS
// records (js/listing-data.js) so listing.js / profile.js can render either
// dataset through the same markup. `images` holds data-URL strings when
// photos were uploaded, or falls back to a gradient pair like the demo data.
function userListingToRecord(item) {
  const [c1, c2] = gradFromId(item.id);
  const images = item.photos && item.photos.length ? item.photos : [[c1, c2], [c2, c1], [c1, "#0D1730"]];

  return {
    id: item.id,
    title: item.title || "Untitled ad",
    price: item.price ? `$${Number(item.price).toLocaleString()}` : "$0",
    loc: item.location || "—",
    tag: item.category || "Other",
    condition: item.condition || "—",
    datePosted:
      item.status === "draft" ? `Draft saved ${timeAgo(item.updatedAt)}` : `Posted ${timeAgo(item.createdAt)}`,
    grad: [c1, c2],
    images,
    description: item.description || "No description yet.",
    specs: [
      { label: "Category", value: item.category || "—" },
      { label: "Condition", value: item.condition || "—" },
    ],
    seller: { ...CURRENT_USER, deals: 0 },
    status: item.status,
    isOwn: true,
  };
}
