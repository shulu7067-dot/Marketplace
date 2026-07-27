/* ============================================================================
   MARKA — User-created listings store (Supabase-backed)
   Everything created on the Sell page (drafts + published ads) is persisted
   to the `listings` table (Supabase/0002 listings.sql), with photos uploaded
   to the "listing-photos" Storage bucket. These use their own string-shaped
   UUIDs from the DB, so they never collide with the numeric LISTING_DETAILS
   ids in js/listing-data.js. listing.js / profile.js render either dataset
   through the same card/detail markup by converting DB rows with
   userListingToRecord() below.

   NOTE ON SCOPE: this wires up the seller's own loop — post, edit, draft,
   delete, view your own ad. Browse/category/search/favorites still read only
   the demo LISTING_DETAILS catalog for now; having them also surface real
   published listings is the natural next slice of backend work.
   ============================================================================ */

const LISTING_STATUSES = ["published", "pending", "sold", "expired", "draft"];
const LISTING_STATUS_META = {
  published: { label: "Active", emptyText: "Ads you post will show up here once they're live." },
  pending: { label: "Pending", emptyText: "Ads awaiting buyer pickup or payment show up here." },
  sold: { label: "Sold", emptyText: "Ads you've marked as sold show up here." },
  expired: { label: "Expired", emptyText: "Ads that ran past their listing period show up here." },
  draft: { label: "Drafts", emptyText: "Unfinished ads you've started but not posted yet." },
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
  const str = String(id);
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return GRAD_PALETTE[hash % GRAD_PALETTE.length];
}

/* ------------------------------ Current user cache ------------------------------ */
let listingsUserId = null;
async function getListingsUserId() {
  if (listingsUserId) return listingsUserId;
  const session = await getSession();
  listingsUserId = session ? session.user.id : null;
  return listingsUserId;
}

/* --------------------------- DB row <-> item shape mapping --------------------------- */
// The rest of the app (sell.js/profile.js/listing.js) was built around a
// simple "item" shape (price as a string, flat lat/lng, etc) — these two
// helpers translate to/from the `listings` table's columns so none of that
// call-site code has to change shape.
function dbRowToItem(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.price != null ? String(row.price) : "",
    category: row.category,
    condition: row.condition,
    location: row.location,
    province: row.province,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    photos: row.photos || [],
    status: row.status,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function itemToDbFields(data) {
  const fields = {};
  if ("title" in data) fields.title = data.title || "";
  if ("description" in data) fields.description = data.description || "";
  if ("price" in data) fields.price = Number(data.price) || 0;
  if ("category" in data) fields.category = data.category || "Other";
  if ("condition" in data) fields.condition = data.condition || "";
  if ("location" in data) fields.location = data.location || "";
  if ("province" in data) fields.province = data.province || null;
  if ("city" in data) fields.city = data.city || null;
  if ("lat" in data) fields.lat = typeof data.lat === "number" ? data.lat : null;
  if ("lng" in data) fields.lng = typeof data.lng === "number" ? data.lng : null;
  if ("photos" in data) fields.photos = data.photos || [];
  if ("status" in data) fields.status = data.status;
  return fields;
}

/* -------------------------------- Photo uploads -------------------------------- */
// Uploads any data-URL entries in `photoUrls` to Storage and returns the full
// list with those swapped for public URLs; entries that are already a real
// URL (previously uploaded) are passed through untouched.
async function uploadListingPhotos(userId, photoUrls) {
  const results = [];
  for (const url of photoUrls) {
    if (!url || !url.startsWith("data:")) {
      results.push(url);
      continue;
    }
    try {
      const blob = await (await fetch(url)).blob();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await supabaseClient.storage.from("listing-photos").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (error) throw error;
      const { data } = supabaseClient.storage.from("listing-photos").getPublicUrl(path);
      results.push(data.publicUrl);
    } catch (err) {
      console.error("Could not upload listing photo:", err);
      results.push(url); // fall back to the data URL rather than losing the photo
    }
  }
  return results;
}

/* -------------------------------- Read / write -------------------------------- */

// Fetches a single listing by id — works for your own listing in any status,
// or anyone's PUBLISHED listing (RLS enforces this; see 0002 listings.sql).
async function getUserListing(id) {
  const { data, error } = await supabaseClient.from("listings").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return dbRowToItem(data);
}

async function getUserListingsByStatus(status) {
  const userId = await getListingsUserId();
  if (!userId) return [];
  const { data, error } = await supabaseClient
    .from("listings")
    .select("*")
    .eq("user_id", userId)
    .eq("status", status)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map(dbRowToItem);
}

// All of the current user's listings, in any status — used by the Insights
// page, which shows every ad's stats together rather than one status at a
// time like the My Listings tab does.
async function getAllUserListings() {
  const userId = await getListingsUserId();
  if (!userId) return [];
  const { data, error } = await supabaseClient
    .from("listings")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map(dbRowToItem);
}

// Creates (no data.id) or updates (data.id present) a listing, uploading any
// freshly-picked photos first. Returns the saved item in the same shape
// getUserListing() returns.
async function saveUserListing(data) {
  const userId = await getListingsUserId();
  if (!userId) throw new Error("You need to be signed in to post an ad.");

  const photos = data.photos ? await uploadListingPhotos(userId, data.photos) : undefined;
  const fields = itemToDbFields({ ...data, photos: photos ?? data.photos });

  if (data.id) {
    const { data: row, error } = await supabaseClient
      .from("listings")
      .update(fields)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    return dbRowToItem(row);
  }

  const { data: row, error } = await supabaseClient
    .from("listings")
    .insert({ ...fields, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return dbRowToItem(row);
}

async function deleteUserListing(id) {
  const { error } = await supabaseClient.from("listings").delete().eq("id", id);
  if (error) console.error("Could not delete listing:", error);
}

/* ------------------------------- Seller info -------------------------------- */
// Small cache of {name, initials, rating, verified, ...} looked up from the
// `profiles` table, keyed by user id — used to fill in the "seller" block on
// a listing card/detail page for listings that aren't the current viewer's.
const sellerInfoCache = {};
async function getSellerInfo(userId) {
  if (sellerInfoCache[userId]) return sellerInfoCache[userId];
  const { data } = await supabaseClient
    .from("profiles")
    .select("full_name, rating, verified, member_since, phone")
    .eq("id", userId)
    .maybeSingle();
  const info = data
    ? {
        name: data.full_name || "Marka user",
        initials: initialsFromName(data.full_name || "M U"),
        memberSince: data.member_since ? String(new Date(data.member_since).getFullYear()) : "",
        rating: Number(data.rating) || 0,
        verified: !!data.verified,
        phone: data.phone || "",
        deals: 0,
      }
    : { name: "Marka user", initials: "MU", memberSince: "", rating: 0, verified: false, phone: "", deals: 0 };
  sellerInfoCache[userId] = info;
  return info;
}

function sellerFromProfile(p) {
  return {
    name: p.name,
    initials: p.initials,
    memberSince: (p.memberSince || "").replace(/^Member since /, ""),
    rating: p.rating,
    verified: p.verified,
    phone: p.phone,
    email: p.email,
    deals: 0,
  };
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
// dataset through the same markup. `images` holds real Storage URLs when
// photos were uploaded, or falls back to a gradient pair like the demo data.
// `seller` must be provided by the caller — pass sellerFromProfile(PROFILE)
// for your own listings, or await getSellerInfo(item.userId) for others'.
function userListingToRecord(item, seller) {
  const [c1, c2] = gradFromId(item.id);
  const images = item.photos && item.photos.length ? item.photos : [[c1, c2], [c2, c1], [c1, "#0D1730"]];

  return {
    id: item.id,
    title: item.title || "Untitled ad",
    price: item.price ? `$${Number(item.price).toLocaleString()}` : "$0",
    loc: item.location || "—",
    province: item.province || null,
    city: item.city || null,
    lat: typeof item.lat === "number" ? item.lat : null,
    lng: typeof item.lng === "number" ? item.lng : null,
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
    seller: seller || { name: "Marka user", initials: "MU", memberSince: "", rating: 0, verified: false, deals: 0 },
    status: item.status,
    isOwn: true,
  };
}
