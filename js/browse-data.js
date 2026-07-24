/* ============================================================================
   MARKA — Browse page data
   Deliberately reuses LISTING_DETAILS (js/listing-data.js) as its single
   source of truth instead of inventing a parallel dataset — that way every
   card rendered on browse.html links to a listing.html detail page whose
   content actually matches what's on the card. Swap buildBrowseListings()
   for an API call once there's a backend; everything downstream (filtering,
   sorting, pagination) just works off the BROWSE_LISTINGS array.
   ============================================================================ */

const BROWSE_CATEGORY_OPTIONS = ["All categories", "Vehicles", "Bikes", "Property", "Electronics", "Phones"];
const BROWSE_CONDITION_OPTIONS = ["Any condition", "New", "Like new", "Restored", "Excellent", "Used - excellent", "Used - good", "Used - like new", "Used - fair"];
const BROWSE_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Lowest Price" },
  { value: "price-high", label: "Highest Price" },
  { value: "popular", label: "Most Popular" },
];

function parsePrice(str) {
  return Number(String(str).replace(/[^0-9.]/g, "")) || 0;
}

// "Posted 5 hours ago" / "Posted 1 day ago" / "Posted 3 days ago" -> hours,
// used only so "Newest" sort has something to sort by.
function parseHoursAgo(str) {
  const m = String(str).match(/Posted (\d+) (hour|day)s? ago/i);
  if (!m) return 999;
  const n = Number(m[1]);
  return m[2].toLowerCase().startsWith("day") ? n * 24 : n;
}

function formatShortAgo(hoursAgo) {
  if (hoursAgo < 24) return `${hoursAgo}h`;
  return `${Math.round(hoursAgo / 24)}d`;
}

function buildBrowseListings() {
  return Object.values(LISTING_DETAILS).map((l) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    priceValue: parsePrice(l.price),
    loc: l.loc,
    tag: l.tag,
    condition: l.condition,
    hoursAgo: parseHoursAgo(l.datePosted),
    popularity: Math.round(l.seller.rating * l.seller.deals),
    verified: l.seller.verified,
    grad: l.grad,
  }));
}

const BROWSE_LISTINGS = buildBrowseListings();

const BROWSE_LOCATION_OPTIONS = ["All locations", ...new Set(BROWSE_LISTINGS.map((l) => l.loc))];

// A fixed little "browsing history" for the Recently viewed row — independent
// of the active filters, the way a real recently-viewed list would be.
const RECENTLY_VIEWED_IDS = [104, 3, 106, 2];
