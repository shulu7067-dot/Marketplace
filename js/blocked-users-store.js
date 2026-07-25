/* ============================================================================
   MARKA — Blocked users store
   Lets a signed-in user block a seller from the listing page or a message
   thread. Persisted to localStorage — no backend yet, same pattern as
   js/saved-searches-store.js. Blocking is keyed by seller name since this
   demo build has no user-id system (js/messages-data.js and js/listing-data.js
   already tie a seller to a listing/conversation by name only).

   Blocking a seller:
   - hides their listings from browse.html, category.html, and the
     similar-listings row on listing.html
   - hides their reply option in messages.html (composer disabled, existing
     thread flagged) without deleting message history
   - is reversible any time from Profile > Settings > Blocked users
   ============================================================================ */

const BLOCKED_USERS_KEY = "marka_blocked_users_v1";
const BLOCKED_USERS_UPDATED_EVENT = "marka:blocked-users-updated";

function notifyBlockedUsersUpdated() {
  window.dispatchEvent(new CustomEvent(BLOCKED_USERS_UPDATED_EVENT));
}

/* --------------------------------- Read / write -------------------------------- */
function readBlockedUsers() {
  try {
    const raw = localStorage.getItem(BLOCKED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeBlockedUsers(list) {
  try {
    localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(list));
  } catch {
    // Storage full/unavailable — this is a local-only demo store, fail quietly.
  }
}

/* --------------------------------- Public API ----------------------------------- */
function getBlockedUsers() {
  return readBlockedUsers();
}

function isUserBlocked(name) {
  if (!name) return false;
  return readBlockedUsers().some((u) => u.name === name);
}

// `user` is anything with { name, initials } — a LISTING_DETAILS seller or a
// messages-store conversation's `seller`. No-ops if already blocked.
function blockUser(user) {
  if (!user || !user.name || isUserBlocked(user.name)) return;
  const list = readBlockedUsers();
  list.unshift({
    name: user.name,
    initials: user.initials || user.name.slice(0, 2).toUpperCase(),
    blockedAt: new Date().toISOString(),
  });
  writeBlockedUsers(list);
  notifyBlockedUsersUpdated();
}

function unblockUser(name) {
  writeBlockedUsers(readBlockedUsers().filter((u) => u.name !== name));
  notifyBlockedUsersUpdated();
}
