/* ============================================================================
   MARKA — Notifications page
   Renders the filterable notification list from js/notifications-store.js,
   handles the filter chips, "mark all as read" action, per-item dismiss, and
   marks an item read the moment it's opened — the same interaction shape as
   js/messages.js's thread list.
   ============================================================================ */

const NOTIF_TYPE_META = {
  message: { icon: "message-circle", cls: "notif-item-icon--message" },
  offer: { icon: "hand-coins", cls: "notif-item-icon--offer" },
  "saved-search": { icon: "bookmark-check", cls: "notif-item-icon--saved-search" },
  "listing-approved": { icon: "check-circle", cls: "notif-item-icon--listing-approved" },
  "price-change": { icon: "tag", cls: "notif-item-icon--price-change" },
};

let notifActiveFilter = "all";

function renderNotifications() {
  const list = document.getElementById("notifList");
  const empty = document.getElementById("notifEmpty");
  const items = getNotifications(notifActiveFilter);

  if (!items.length) {
    list.innerHTML = "";
    list.style.display = "none";
    empty.style.display = "flex";
    refreshIcons();
    return;
  }
  list.style.display = "flex";
  empty.style.display = "none";

  list.innerHTML = items
    .map((n) => {
      const meta = NOTIF_TYPE_META[n.type] || NOTIF_TYPE_META.message;
      return `
        <a class="notif-item ${n.read ? "" : "is-unread"}" href="${n.href}" data-notif-id="${n.id}">
          <div class="notif-item-icon ${meta.cls}"><i data-lucide="${meta.icon}"></i></div>
          <div class="notif-item-body">
            <div class="notif-item-top">
              <span class="notif-item-title">${n.title}</span>
              <span class="notif-item-time">${notifTimeAgo(n.createdAt)}</span>
            </div>
            <p class="notif-item-desc">${n.body}</p>
          </div>
          ${n.read ? "" : '<span class="notif-unread-dot" aria-hidden="true"></span>'}
          <button type="button" class="notif-item-dismiss" data-notif-dismiss="${n.id}" aria-label="Dismiss notification">
            <i data-lucide="x"></i>
          </button>
        </a>`;
    })
    .join("");

  refreshIcons();
  applyNotifMarkAllState();
}

function applyNotifMarkAllState() {
  const btn = document.getElementById("notifMarkAllBtn");
  if (!btn) return;
  btn.disabled = getTotalUnreadNotificationsCount() === 0;
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavLinks("");
  renderBottomNav("");
  renderNotifications();

  document.getElementById("notifFilterTabs").addEventListener("click", (e) => {
    const tab = e.target.closest("[data-notif-filter]");
    if (!tab) return;
    notifActiveFilter = tab.dataset.notifFilter;
    document
      .querySelectorAll("#notifFilterTabs .sub-tab")
      .forEach((t) => {
        const active = t === tab;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", String(active));
      });
    renderNotifications();
  });

  document.getElementById("notifMarkAllBtn").addEventListener("click", () => {
    markAllNotificationsRead();
  });

  document.getElementById("notifList").addEventListener("click", (e) => {
    const dismissBtn = e.target.closest("[data-notif-dismiss]");
    if (dismissBtn) {
      e.preventDefault();
      deleteNotification(dismissBtn.dataset.notifDismiss);
      return;
    }
    const item = e.target.closest("[data-notif-id]");
    if (item) markNotificationRead(item.dataset.notifId);
  });

  window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, renderNotifications);
});
