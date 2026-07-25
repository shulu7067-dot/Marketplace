/* ============================================================================
   MARKA — Buyer ↔ Seller messages store
   Everything sent through messages.html (and the "Message Seller" button on
   listing.html) is persisted to localStorage, since this build has no
   backend — same pattern as js/listings-store.js. Also simulates the seller
   side of a conversation (read receipts, online status, a reply) with
   timeouts so the chat feels alive in a no-backend demo.

   Conversation shape:
   {
     id, listingId, listingTitle, listingPrice, listingGrad, listingImage,
     seller: { name, initials, online, lastSeenAt },
     buyerLastSeenAt,               // used to compute the unread badge
     messages: [
       { id, sender: "buyer" | "seller", text?, image?, sentAt, status? }
       // status ("sent" | "delivered" | "read") only tracked on buyer
       // messages — that's the read receipt shown under the bubble.
     ],
   }
   ============================================================================ */

const MESSAGES_KEY = "marka_messages_v1";
const MESSAGES_UPDATED_EVENT = "marka:messages-updated";

const SELLER_REPLIES = [
  "Sounds good to me!",
  "Sure, that works.",
  "Let me check and get back to you shortly.",
  "Yes, it's still available.",
  "I can do that — just confirm the time.",
  "Thanks for reaching out, happy to answer anything else.",
];

function notifyMessagesUpdated() {
  window.dispatchEvent(new CustomEvent(MESSAGES_UPDATED_EVENT));
}

function newMessageId() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function newConversationId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* --------------------------------- Read / write -------------------------------- */
function readConversations() {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seeding
  }
  // First run (or corrupt storage) — seed from the demo data and persist it.
  const seeded = JSON.parse(JSON.stringify(MESSAGE_SEED));
  writeConversations(seeded);
  return seeded;
}

function writeConversations(list) {
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(list));
  } catch {
    // Storage full/unavailable — this is a local-only demo store, fail quietly.
  }
}

/* -------------------------------- Derived helpers ------------------------------- */
function lastMessageOf(conv) {
  return conv.messages.length ? conv.messages[conv.messages.length - 1] : null;
}

function lastActivityOf(conv) {
  const last = lastMessageOf(conv);
  return last ? last.sentAt : conv.buyerLastSeenAt || "1970-01-01T00:00:00.000Z";
}

function unreadCountFor(conv) {
  const seenAt = new Date(conv.buyerLastSeenAt || 0).getTime();
  return conv.messages.filter((m) => m.sender === "seller" && new Date(m.sentAt).getTime() > seenAt).length;
}

function getConversations() {
  return readConversations()
    .map((c) => ({ ...c, unread: unreadCountFor(c) }))
    .sort((a, b) => new Date(lastActivityOf(b)) - new Date(lastActivityOf(a)));
}

function getConversation(id) {
  const conv = readConversations().find((c) => c.id === id);
  return conv ? { ...conv, unread: unreadCountFor(conv) } : null;
}

function getTotalUnreadCount() {
  return readConversations().reduce((sum, c) => sum + unreadCountFor(c), 0);
}

/* Every seller in this demo replies eventually — used to render "Online now"
   vs. "Last seen …" in the chat header. */
function sellerStatusText(seller) {
  if (seller.online) return "Online now";
  if (!seller.lastSeenAt) return "Offline";
  return `Last seen ${timeAgoShort(seller.lastSeenAt)}`;
}

function timeAgoShort(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/* ---------------------------- Find or start a thread ---------------------------- */
// Called from listing.js's "Message Seller" button. Reuses an existing
// thread for the same listing if one exists, otherwise opens a new one.
function findOrCreateConversation({ listingId, listingTitle, listingPrice, listingGrad, listingImage, seller }) {
  const list = readConversations();
  let conv = list.find((c) => String(c.listingId) === String(listingId));
  if (conv) return conv.id;

  conv = {
    id: newConversationId(),
    listingId,
    listingTitle,
    listingPrice,
    listingGrad: listingGrad || null,
    listingImage: listingImage || null,
    seller: { online: false, ...seller },
    buyerLastSeenAt: new Date(0).toISOString(),
    messages: [],
  };
  list.push(conv);
  writeConversations(list);
  return conv.id;
}

/* ---------------------------------- Sending ------------------------------------- */
// image: a data-URL string (uploaded photo) — kept consistent with how
// js/listings-store.js stores uploaded listing photos.
function sendBuyerMessage(conversationId, { text, image } = {}) {
  const list = readConversations();
  const conv = list.find((c) => c.id === conversationId);
  if (!conv) return null;

  const message = {
    id: newMessageId(),
    sender: "buyer",
    sentAt: new Date().toISOString(),
    status: "sent",
  };
  if (text) message.text = text;
  if (image) message.image = image;
  conv.messages.push(message);
  writeConversations(list);
  notifyMessagesUpdated();

  simulateDelivery(conversationId, message.id);
  simulateSellerResponse(conversationId);
  return message;
}

// "Sent" → "delivered" almost immediately, then "read" once the (simulated)
// seller looks at the conversation — mirrors typical chat-app read receipts.
function simulateDelivery(conversationId, messageId) {
  setTimeout(() => updateMessageStatus(conversationId, messageId, "delivered"), 500);
}

function updateMessageStatus(conversationId, messageId, status) {
  const list = readConversations();
  const conv = list.find((c) => c.id === conversationId);
  if (!conv) return;
  const msg = conv.messages.find((m) => m.id === messageId);
  if (!msg) return;
  msg.status = status;
  writeConversations(list);
  notifyMessagesUpdated();
}

function markAllBuyerMessagesRead(conversationId) {
  const list = readConversations();
  const conv = list.find((c) => c.id === conversationId);
  if (!conv) return;
  let changed = false;
  conv.messages.forEach((m) => {
    if (m.sender === "buyer" && m.status !== "read") {
      m.status = "read";
      changed = true;
    }
  });
  if (changed) {
    writeConversations(list);
    notifyMessagesUpdated();
  }
}

// A lightweight "seller is typing, then replies" simulation so the demo chat
// feels responsive without a real backend. Also flips the read receipt on
// the buyer's messages, and toggles the seller "online" while they reply.
function simulateSellerResponse(conversationId) {
  const readDelay = 900 + Math.random() * 900;
  const replyDelay = readDelay + 1800 + Math.random() * 1800;

  setTimeout(() => markAllBuyerMessagesRead(conversationId), readDelay);

  setTimeout(() => {
    const list = readConversations();
    const conv = list.find((c) => c.id === conversationId);
    if (!conv) return;
    conv.seller.online = true;
    conv.messages.push({
      id: newMessageId(),
      sender: "seller",
      text: SELLER_REPLIES[Math.floor(Math.random() * SELLER_REPLIES.length)],
      sentAt: new Date().toISOString(),
    });
    writeConversations(list);
    notifyMessagesUpdated();
  }, replyDelay);

  window.dispatchEvent(new CustomEvent("marka:seller-typing", { detail: { conversationId, delay: replyDelay } }));
}

function markConversationSeen(conversationId) {
  const list = readConversations();
  const conv = list.find((c) => c.id === conversationId);
  if (!conv) return;
  conv.buyerLastSeenAt = new Date().toISOString();
  writeConversations(list);
  notifyMessagesUpdated();
}
