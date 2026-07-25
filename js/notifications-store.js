/* ============================================================================
   MARKA — Notifications store
   Persists notification state to localStorage since this build has no
   backend — same pattern as js/messages-store.js and js/listings-store.js.
   Loaded on every page (right after js/notifications-data.js) so the bell
   icon in the topbar can show a live unread badge anywhere on the site, not
   just on notifications.html itself.

   Notification shape:
   { id, type, title, body, createdAt, read, href }
   ============================================================================ */

const NOTIFICATIONS_KEY = "marka_notifications_v1";
const NOTIFICATIONS_UPDATED_EVENT = "marka:notifications-updated";

function notifyNotificationsUpdated() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
}

/* --------------------------------- Read / write -------------------------------- */
function readNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seeding
  }
  // First run (or corrupt storage) — seed from the demo data and persist it.
  const seeded = JSON.parse(JSON.stringify(NOTIFICATIONS_SEED));
  writeNotifications(seeded);
  return seeded;
}

function writeNotifications(list) {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
  } catch {
    // Storage full/unavailable — this is a local-only demo store, fail quietly.
  }
}

/* -------------------------------- Derived helpers ------------------------------- */
function getNotifications(type) {
  const list = readNotifications().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return type && type !== "all" ? list.filter((n) => n.type === type) : list;
}

function getNotification(id) {
  return readNotifications().find((n) => n.id === id) || null;
}

function getTotalUnreadNotificationsCount() {
  return readNotifications().filter((n) => !n.read).length;
}

function notifTimeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  return `${weeks}w ago`;
}

/* ----------------------------------- Actions ------------------------------------- */
function markNotificationRead(id) {
  const list = readNotifications();
  const n = list.find((x) => x.id === id);
  if (!n || n.read) return;
  n.read = true;
  writeNotifications(list);
  notifyNotificationsUpdated();
}

function markAllNotificationsRead() {
  const list = readNotifications();
  let changed = false;
  list.forEach((n) => {
    if (!n.read) {
      n.read = true;
      changed = true;
    }
  });
  if (changed) {
    writeNotifications(list);
    notifyNotificationsUpdated();
  }
}

function deleteNotification(id) {
  const list = readNotifications().filter((n) => n.id !== id);
  writeNotifications(list);
  notifyNotificationsUpdated();
}
