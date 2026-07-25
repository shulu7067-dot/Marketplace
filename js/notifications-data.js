/* ============================================================================
   MARKA — Notifications seed data
   Demo notification history so notifications.html has something to show on
   first load. Real state (read/unread, anything dismissed) lives in
   localStorage via js/notifications-store.js — this file only supplies the
   starting point, the same pattern js/messages-data.js uses for chat threads.

   type is one of: "message" | "offer" | "saved-search" | "listing-approved"
   | "price-change" — each maps to an icon + accent color in
   css/notifications.css (see NOTIF_TYPE_META in js/notifications.js).
   Listing ids/titles below match js/listing-data.js so links resolve to
   real listing pages.
   ============================================================================ */

// minutesAgo() is resolved once, at load time, so the seed timestamps always
// read as "recent" no matter when the demo is opened.
function notifMinutesAgo(mins) {
  return new Date(Date.now() - mins * 60000).toISOString();
}

const NOTIFICATIONS_SEED = [
  {
    id: "n_seed_1",
    type: "message",
    title: "New message from Sam Okafor",
    body: "About your listing “Trek Marlin 7 mountain bike” — “Is this still available?”",
    createdAt: notifMinutesAgo(12),
    read: false,
    href: "messages.html",
  },
  {
    id: "n_seed_2",
    type: "offer",
    title: "New offer on your '98 Land Cruiser, restored",
    body: "Diego Ferreira offered $14,200 — 5% below your asking price.",
    createdAt: notifMinutesAgo(55),
    read: false,
    href: "listing.html?id=2",
  },
  {
    id: "n_seed_3",
    type: "saved-search",
    title: "3 new matches for “trek marlin”",
    body: "New listings match your saved search in Bikes, under $500.",
    createdAt: notifMinutesAgo(4 * 60),
    read: false,
    href: "browse.html",
  },
  {
    id: "n_seed_4",
    type: "message",
    title: "New message from Leon Brandt",
    body: "About “iPhone 14 Pro, unlocked” — “Would you take $780?”",
    createdAt: notifMinutesAgo(9 * 60),
    read: true,
    href: "messages.html",
  },
  {
    id: "n_seed_5",
    type: "listing-approved",
    title: "Your listing was approved",
    body: "“Restored '46 roadster” passed review and is now live on Marka.",
    createdAt: notifMinutesAgo(26 * 60),
    read: true,
    href: "listing.html?id=103",
  },
  {
    id: "n_seed_6",
    type: "price-change",
    title: "Price drop on a saved favorite",
    body: "“iPhone 14 Pro, unlocked” dropped 10%, now $780.",
    createdAt: notifMinutesAgo(30 * 60),
    read: true,
    href: "listing.html?id=106",
  },
  {
    id: "n_seed_7",
    type: "offer",
    title: "New offer on your Trek Marlin 7 mountain bike",
    body: "Priya Nair offered $340.",
    createdAt: notifMinutesAgo(46 * 60),
    read: true,
    href: "listing.html?id=101",
  },
  {
    id: "n_seed_8",
    type: "price-change",
    title: "Price change on Modern 200m² family house",
    body: "The seller raised the price by $8,000 to reflect a recent renovation.",
    createdAt: notifMinutesAgo(3 * 24 * 60),
    read: true,
    href: "listing.html?id=105",
  },
  {
    id: "n_seed_9",
    type: "saved-search",
    title: "New match in Electronics, Like new",
    body: "A listing matching your saved search near Riverside, NY was just posted.",
    createdAt: notifMinutesAgo(5 * 24 * 60),
    read: true,
    href: "browse.html",
  },
];
