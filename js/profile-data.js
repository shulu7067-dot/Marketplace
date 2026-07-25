/* ============================================================================
   MARKA — Profile page data
   The signed-in user's own info, plus which LISTING_DETAILS ids (js/listing-
   data.js) belong to them or are favorited. Reusing LISTING_DETAILS as the
   single source of truth means every card here links to a listing.html page
   whose content actually matches. Swap for an API call once there's a backend.
   ============================================================================ */

const PROFILE = {
  name: "Jordan Diaz",
  initials: "JD",
  loc: "Riverside, NY",
  memberSince: "Member since 2021",
  email: "jordan.diaz@example.com",
  rating: 4.9,
  verified: true,
  // Which of the three checks make up the verified badge. All true is what
  // currently unlocks `verified: true` above — js/profile.js keeps these two
  // in sync as steps complete via the "Get verified" flow.
  verificationSteps: { email: true, phone: true, id: true },
  bio: "Trading bikes, home goods, and the occasional restored classic since 2021. I reply fast and always meet in public spots — check my reviews below.",
  avatarGrad: null, // [color1, color2] once the user picks a swatch in Edit profile; null = default CSS gradient
  stats: [
    { label: "Active listings", value: "6", icon: "layout-grid" },
    { label: "Items sold", value: "48", icon: "check-circle" },
    { label: "Rating", value: "4.9", icon: "star" },
    { label: "Response rate", value: "97%", icon: "message-circle" },
  ],
};

// Listings this user currently has posted — pulled straight out of
// LISTING_DETAILS so titles, prices, and images always stay in sync. Each
// entry carries the status it should show under on the Listings tab
// (js/listings-store.js holds the matching LISTING_STATUS_META labels).
const MY_LISTING_IDS = [
  { id: 2, status: "published" },
  { id: 101, status: "published" },
  { id: 103, status: "pending" },
  { id: 105, status: "sold" },
];

// Ids of listings this user has favorited (seeds state.favs on load).
const MY_FAVORITE_IDS = [1, 104, 106];

const PROFILE_REVIEWS = [
  {
    id: "r1",
    initials: "AK",
    name: "Amara Khan",
    rating: 5,
    date: "2 weeks ago",
    text: "Smooth trade from start to finish. Jordan was upfront about the bike's condition and even threw in a spare tube. Would buy from again.",
    helpful: 9,
  },
  {
    id: "r2",
    initials: "RT",
    name: "Ravi Thompson",
    rating: 5,
    date: "1 month ago",
    text: "Great communication and showed up right on time. The item was exactly as described in the listing.",
    helpful: 4,
  },
  {
    id: "r3",
    initials: "SL",
    name: "Sofia Lindqvist",
    rating: 4,
    date: "2 months ago",
    text: "Good experience overall — pickup location was a little out of the way, but Jordan was easy to work with and fair on price.",
    helpful: 2,
  },
  {
    id: "r4",
    initials: "MP",
    name: "Marcus Pryce",
    rating: 3,
    date: "3 months ago",
    text: "Item was fine but arranging a pickup time took a few extra messages back and forth. Got there in the end.",
    helpful: 1,
  },
];

const SETTINGS_ITEMS = [
  { icon: "user", label: "Personal information", hint: "Name, email, phone" },
  { icon: "shield-check", label: "Verification", hint: "", key: "verification" },
  { icon: "bell", label: "Notifications", hint: "Push, email & SMS alerts" },
  { icon: "credit-card", label: "Payment methods", hint: "Cards & payout details" },
  { icon: "shield-check", label: "Privacy & security", hint: "Password, 2FA" },
  { icon: "circle-help", label: "Help & support", hint: "FAQs, contact us" },
  { icon: "log-out", label: "Log out", hint: "", danger: true },
];
