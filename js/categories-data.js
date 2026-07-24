/* ============================================================================
   MARKA — Categories data
   Shared by categories.html (All categories) and category.html (individual
   category + subcategories). Reuses the same labels/icons/colors as the
   home page's CATEGORIES array (js/script.js) so a category card looks the
   same everywhere, and reuses LISTING_DETAILS (js/listing-data.js, loaded
   before this file) as the single source of truth for which listings belong
   to which category — the same "no parallel dataset" approach browse-data.js
   already uses. Swap for an API call once there's a backend.
   ============================================================================ */

const CATEGORY_DETAILS = [
  {
    slug: "vehicles",
    label: "Vehicles",
    icon: "car",
    color: "#2F5D62",
    bg: "#E4EEEE",
    description: "Cars, trucks, and classics from local sellers and dealers.",
    subcategories: ["Cars", "SUVs & Trucks", "Motorcycles", "Auto parts"],
  },
  {
    slug: "bikes",
    label: "Bikes",
    icon: "bike",
    color: "#5B4B9A",
    bg: "#ECE8F6",
    description: "Mountain, road, gravel, and electric bikes, plus parts.",
    subcategories: ["Mountain bikes", "Road & Gravel", "Electric bikes", "Bike parts & accessories"],
  },
  {
    slug: "property",
    label: "Property",
    icon: "home",
    color: "#C6841F",
    bg: "#F7E8CE",
    description: "Houses, apartments, land, and commercial listings.",
    subcategories: ["Houses", "Apartments", "Land", "Commercial"],
  },
  {
    slug: "electronics",
    label: "Electronics",
    icon: "monitor",
    color: "#B0472D",
    bg: "#F6E2DC",
    description: "Computers, monitors, TVs, audio gear, and cameras.",
    subcategories: ["Computers & Monitors", "TVs & Audio", "Cameras", "Gaming"],
  },
  {
    slug: "phones",
    label: "Phones",
    icon: "smartphone",
    color: "#1F8A4C",
    bg: "#DFF3E6",
    description: "Smartphones, tablets, smartwatches, and accessories.",
    subcategories: ["Smartphones", "Tablets", "Smartwatches", "Accessories"],
  },
];

// Which subcategory each mock listing (js/listing-data.js) falls under. Not
// every real field a backend would have — just enough for the subcategory
// pills on category.html to actually filter something real.
const LISTING_SUBCATEGORY = {
  1: "Houses",
  2: "SUVs & Trucks",
  3: "Road & Gravel",
  101: "Mountain bikes",
  102: "Cars",
  103: "Cars",
  104: "Computers & Monitors",
  105: "Houses",
  106: "Smartphones",
};

function getCategoryBySlug(slug) {
  return CATEGORY_DETAILS.find((c) => c.slug === slug) || null;
}

// Count of mock listings tagged with this category's label.
function getCategoryListingCount(label) {
  return Object.values(LISTING_DETAILS).filter((l) => l.tag === label).length;
}

// Listings (as browse-style cards) for one category, optionally narrowed to
// a single subcategory. Mirrors buildBrowseListings() in js/browse-data.js
// so the cards render identically to the ones on browse.html.
function getCategoryListings(label, subcategory) {
  return Object.values(LISTING_DETAILS)
    .filter((l) => l.tag === label)
    .filter((l) => !subcategory || subcategory === "All" || LISTING_SUBCATEGORY[l.id] === subcategory)
    .map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      priceValue: Number(String(l.price).replace(/[^0-9.]/g, "")) || 0,
      loc: l.loc,
      condition: l.condition,
      verified: l.seller.verified,
      grad: l.grad,
      subcategory: LISTING_SUBCATEGORY[l.id] || "",
    }));
}
