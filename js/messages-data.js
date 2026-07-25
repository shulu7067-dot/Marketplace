/* ============================================================================
   MARKA — Messages seed data
   Demo conversation history so messages.html has something to show on first
   load. Real data (new conversations, sent messages, read state) lives in
   localStorage via js/messages-store.js — this file only supplies the
   starting point, the same way js/listing-data.js seeds LISTING_DETAILS.
   Sellers here reuse the same names/initials as js/listing-data.js so a
   conversation started from a listing page matches up with its seed thread.
   ============================================================================ */

// Stand-in for the signed-in user until there's a real account system.
// Mirrors CURRENT_USER in js/listings-store.js (kept separate on purpose so
// messages.html doesn't need listings-store.js just to know who "you" are).
const MSG_CURRENT_USER = { name: "Jordan Diaz", initials: "JD" };

// minutesAgo() is resolved once, at load time, so the seed thread timestamps
// always read as "recent" no matter when the demo is opened.
function minutesAgo(mins) {
  return new Date(Date.now() - mins * 60000).toISOString();
}

const MESSAGE_SEED = [
  {
    id: "c_seed_1",
    listingId: 101,
    listingTitle: "Trek Marlin 7 mountain bike",
    listingPrice: "$540",
    listingGrad: ["#2F5D62", "#16213E"],
    seller: { name: "Sam Okafor", initials: "SO", online: true },
    buyerLastSeenAt: minutesAgo(50),
    messages: [
      { id: "m1", sender: "buyer", text: "Hi! Is the Trek Marlin still available?", sentAt: minutesAgo(180), status: "read" },
      { id: "m2", sender: "seller", text: "Yep, still have it. Barely ridden, size medium.", sentAt: minutesAgo(175) },
      { id: "m3", sender: "buyer", text: "Great — any chance you could do $500?", sentAt: minutesAgo(170), status: "read" },
      { id: "m4", sender: "seller", text: "Could meet in the middle at $520 if you can pick up this week.", sentAt: minutesAgo(165) },
      { id: "m5", sender: "seller", image: ["#5B4B9A", "#2F5D62"], sentAt: minutesAgo(164) },
      { id: "m6", sender: "buyer", text: "Looks great, deal! Are you free Saturday morning?", sentAt: minutesAgo(60), status: "delivered" },
    ],
  },
  {
    id: "c_seed_2",
    listingId: 2,
    listingTitle: "'98 Land Cruiser, restored",
    listingPrice: "$18,500",
    listingGrad: ["#16213E", "#0D1730"],
    seller: { name: "Diego Ferreira", initials: "DF", online: false, lastSeenAt: minutesAgo(240) },
    buyerLastSeenAt: minutesAgo(1500),
    messages: [
      { id: "m1", sender: "buyer", text: "Does the Land Cruiser come with service records?", sentAt: minutesAgo(1600), status: "read" },
      { id: "m2", sender: "seller", text: "Full history since the restoration in 2022, yes.", sentAt: minutesAgo(1550) },
      { id: "m3", sender: "seller", text: "Happy to send photos of the receipts if that helps.", sentAt: minutesAgo(1549) },
      { id: "m4", sender: "buyer", text: "That'd be great, thank you.", sentAt: minutesAgo(1540), status: "read" },
    ],
  },
  {
    id: "c_seed_3",
    listingId: 106,
    listingTitle: "iPhone 14 Pro, unlocked",
    listingPrice: "$690",
    listingGrad: ["#B0472D", "#8A5A12"],
    seller: { name: "Leon Brandt", initials: "LB", online: true },
    buyerLastSeenAt: minutesAgo(4000),
    messages: [
      { id: "m1", sender: "seller", text: "Thanks for your interest — battery health is 91%.", sentAt: minutesAgo(4200) },
      { id: "m2", sender: "buyer", text: "Perfect, does it come with the original box?", sentAt: minutesAgo(4100), status: "read" },
      { id: "m3", sender: "seller", text: "It does, plus an unused cable.", sentAt: minutesAgo(4090) },
      { id: "m4", sender: "buyer", text: "Sounds good — I'll take it.", sentAt: minutesAgo(4080), status: "read" },
      { id: "m5", sender: "seller", text: "Great, I'll hold it for you. Let me know when you can pick up.", sentAt: minutesAgo(4070) },
    ],
  },
  {
    id: "c_seed_4",
    listingId: 1,
    listingTitle: "Coastal 4-bed family home",
    listingPrice: "$1,240,000",
    listingGrad: ["#C6841F", "#8A5A12"],
    seller: { name: "Maria Alonso", initials: "MA", online: false, lastSeenAt: minutesAgo(2 * 60 * 24) },
    buyerLastSeenAt: minutesAgo(20000),
    messages: [
      { id: "m1", sender: "buyer", text: "Is the property still on the market?", sentAt: minutesAgo(20200), status: "read" },
      { id: "m2", sender: "seller", text: "Yes, still available — would you like to schedule a viewing?", sentAt: minutesAgo(20100) },
    ],
  },
];
