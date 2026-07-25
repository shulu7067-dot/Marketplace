/* ============================================================================
   MARKA — Messages page logic
   Renders the thread list + active chat panel from js/messages-store.js,
   handles sending text/image messages, and reacts to the simulated seller
   side (typing indicator, replies, read receipts, online status) via the
   marka:messages-updated / marka:seller-typing events the store dispatches.
   ============================================================================ */

const msgState = {
  activeId: null,
  search: "",
  pendingImage: null, // data URL staged in the composer, cleared on send
  typingTimer: null,
};

/* ------------------------------------ Utils -------------------------------------- */
function mediaStyleFor(img) {
  if (!img) return "";
  if (Array.isArray(img)) return `background-image:linear-gradient(135deg, ${img[0]}, ${img[1]});`;
  return `background-image:url('${img}');background-size:cover;background-position:center;`;
}

function formatClockTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* -------------------------------- Thread list ------------------------------------ */
function matchesSearch(conv, q) {
  if (!q) return true;
  const hay = `${conv.seller.name} ${conv.listingTitle}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function renderThreadList() {
  const list = document.getElementById("msgThreadList");
  const conversations = getConversations().filter((c) => matchesSearch(c, msgState.search));

  if (!conversations.length) {
    list.innerHTML = `<div class="msg-empty-list">No conversations yet. Message a seller from any listing to start one.</div>`;
    refreshIcons();
    return;
  }

  list.innerHTML = conversations
    .map((conv) => {
      const last = conv.messages.length ? conv.messages[conv.messages.length - 1] : null;
      const preview = last ? (last.text ? last.text : "📷 Photo") : "No messages yet";
      const time = last ? timeAgoShort(last.sentAt) : "";
      return `
      <button class="msg-thread ${conv.id === msgState.activeId ? "active" : ""} ${conv.unread ? "has-unread" : ""}" data-conv-id="${conv.id}">
        <div class="msg-avatar-wrap">
          <div class="msg-avatar">${conv.seller.initials}</div>
          <span class="msg-online-dot ${conv.seller.online ? "" : "msg-online-dot--off"}"></span>
        </div>
        <div class="msg-thread-body">
          <div class="msg-thread-top">
            <span class="msg-thread-name">${escapeHTML(conv.seller.name)}</span>
            <span class="msg-thread-time">${time}</span>
          </div>
          <div class="msg-thread-listing">${escapeHTML(conv.listingTitle)}</div>
          <div class="msg-thread-preview">${isUserBlocked(conv.seller.name) ? `<span class="msg-thread-blocked-tag">Blocked</span>` : escapeHTML(preview)}</div>
        </div>
        ${conv.unread ? `<span class="msg-unread-badge">${conv.unread}</span>` : ""}
      </button>`;
    })
    .join("");
  refreshIcons();
}

/* --------------------------------- Chat panel ------------------------------------- */
function readTickHTML(status) {
  if (status === "read") return `<span class="read-tick read-tick--read"><i data-lucide="check-check"></i></span>`;
  if (status === "delivered") return `<span class="read-tick"><i data-lucide="check-check"></i></span>`;
  return `<span class="read-tick"><i data-lucide="check"></i></span>`;
}

function renderMessages(conv) {
  const scroll = document.getElementById("msgScroll");
  let lastDay = null;
  let html = "";

  conv.messages.forEach((m) => {
    const day = formatDayLabel(m.sentAt);
    if (day !== lastDay) {
      html += `<div class="msg-date-sep">${day}</div>`;
      lastDay = day;
    }
    const mine = m.sender === "buyer";
    html += `<div class="msg-bubble-row ${mine ? "mine" : ""}">`;
    if (m.image) {
      html += `<div class="msg-bubble-image" style="${mediaStyleFor(m.image)}"></div>`;
    } else {
      html += `<div class="msg-bubble">${escapeHTML(m.text || "")}</div>`;
    }
    html += `</div>`;
    html += `<div class="msg-meta-row ${mine ? "mine" : ""}">
      <span>${formatClockTime(m.sentAt)}</span>
      ${mine ? readTickHTML(m.status) : ""}
    </div>`;
  });

  scroll.innerHTML = html;
  refreshIcons();
  scroll.scrollTop = scroll.scrollHeight;
}

function renderChatHeader(conv) {
  document.getElementById("msgChatAvatar").textContent = conv.seller.initials;
  document.getElementById("msgChatName").textContent = conv.seller.name;
  const statusEl = document.getElementById("msgChatStatus");
  statusEl.textContent = sellerStatusText(conv.seller);
  statusEl.classList.toggle("online", !!conv.seller.online);

  const listingEl = document.getElementById("msgChatListing");
  listingEl.href = `listing.html?id=${conv.listingId}`;
  document.getElementById("msgChatListingThumb").setAttribute(
    "style",
    mediaStyleFor(conv.listingGrad || conv.listingImage)
  );
  document.getElementById("msgChatListingTitle").textContent = conv.listingTitle;
  document.getElementById("msgChatListingPrice").textContent = conv.listingPrice || "";

  const blocked = isUserBlocked(conv.seller.name);
  const blockBtn = document.getElementById("msgBlockBtn");
  blockBtn.classList.toggle("is-blocked", blocked);
  blockBtn.setAttribute("aria-label", blocked ? "Unblock user" : "Block user");
  blockBtn.innerHTML = `<i data-lucide="${blocked ? "user-check" : "user-x"}"></i>`;

  document.getElementById("msgBlockedBanner").style.display = blocked ? "flex" : "none";
  document.getElementById("msgComposer").style.display = blocked ? "none" : "flex";
}

function renderPanel() {
  const emptyEl = document.getElementById("msgPanelEmpty");
  const activeEl = document.getElementById("msgPanelActive");

  if (!msgState.activeId) {
    emptyEl.style.display = "flex";
    activeEl.style.display = "none";
    return;
  }
  const conv = getConversation(msgState.activeId);
  if (!conv) {
    msgState.activeId = null;
    emptyEl.style.display = "flex";
    activeEl.style.display = "none";
    return;
  }
  emptyEl.style.display = "none";
  activeEl.style.display = "flex";
  renderChatHeader(conv);
  renderMessages(conv);
}

/* ----------------------------------- Typing --------------------------------------- */
function showTyping() {
  document.getElementById("msgTypingRow").style.display = "flex";
  const scroll = document.getElementById("msgScroll");
  scroll.scrollTop = scroll.scrollHeight;
}
function hideTyping() {
  document.getElementById("msgTypingRow").style.display = "none";
}

/* ------------------------------------ Actions -------------------------------------- */
function openConversation(id) {
  msgState.activeId = id;
  markConversationSeen(id);
  document.getElementById("msgShell").classList.add("msg-shell--chat-open");
  document.body.classList.add("msg-chat-active");
  hideTyping();
  renderThreadList();
  renderPanel();

  const url = new URL(window.location.href);
  url.searchParams.set("c", id);
  window.history.replaceState({}, "", url);
}

function closeConversation() {
  document.getElementById("msgShell").classList.remove("msg-shell--chat-open");
  document.body.classList.remove("msg-chat-active");
}

function clearComposer() {
  const input = document.getElementById("msgInput");
  input.value = "";
  input.style.height = "";
  msgState.pendingImage = null;
  document.getElementById("msgImagePreview").classList.remove("visible");
  document.getElementById("msgFileInput").value = "";
  updateSendButtonState();
}

function updateSendButtonState() {
  const input = document.getElementById("msgInput");
  const sendBtn = document.getElementById("msgSendBtn");
  sendBtn.disabled = !input.value.trim() && !msgState.pendingImage;
}

function handleSend() {
  if (!msgState.activeId) return;
  const conv = getConversation(msgState.activeId);
  if (conv && isUserBlocked(conv.seller.name)) return;
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (!text && !msgState.pendingImage) return;

  sendBuyerMessage(msgState.activeId, { text, image: msgState.pendingImage });
  clearComposer();
  renderThreadList();
  renderPanel();
}

function handleImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    msgState.pendingImage = reader.result;
    const preview = document.getElementById("msgImagePreview");
    preview.classList.add("visible");
    document.getElementById("msgImagePreviewThumb").style.backgroundImage = `url('${reader.result}')`;
    updateSendButtonState();
  };
  reader.readAsDataURL(file);
}

async function handleToggleBlockSeller() {
  if (!msgState.activeId) return;
  const conv = getConversation(msgState.activeId);
  if (!conv) return;
  const alreadyBlocked = isUserBlocked(conv.seller.name);
  const confirmed = await confirmModal({
    title: alreadyBlocked ? "Unblock this user?" : "Block this user?",
    message: alreadyBlocked
      ? `${conv.seller.name} will be able to message you again and their listings will show up again.`
      : `You won't be able to send or receive messages from ${conv.seller.name}, and their listings will be hidden. You can undo this any time from Profile > Settings > Blocked users.`,
    confirmLabel: alreadyBlocked ? "Unblock" : "Block",
    danger: !alreadyBlocked,
  });
  if (!confirmed) return;

  if (alreadyBlocked) unblockUser(conv.seller.name);
  else blockUser(conv.seller);

  renderThreadList();
  renderPanel();
  refreshIcons();
}

/* ------------------------------------- Init ---------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderNavLinks("");
  renderBottomNav("messages");

  const requestedId = new URLSearchParams(window.location.search).get("c");
  if (requestedId && getConversation(requestedId)) {
    msgState.activeId = requestedId;
    markConversationSeen(requestedId);
    document.getElementById("msgShell").classList.add("msg-shell--chat-open");
    document.body.classList.add("msg-chat-active");
  }

  renderThreadList();
  renderPanel();

  document.getElementById("msgThreadList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-conv-id]");
    if (btn) openConversation(btn.dataset.convId);
  });

  document.getElementById("msgBackBtn").addEventListener("click", closeConversation);

  document.getElementById("msgBlockBtn").addEventListener("click", handleToggleBlockSeller);
  document.getElementById("msgUnblockBtn").addEventListener("click", handleToggleBlockSeller);

  document.getElementById("msgSearchInput").addEventListener("input", (e) => {
    msgState.search = e.target.value;
    renderThreadList();
  });

  const input = document.getElementById("msgInput");
  input.addEventListener("input", () => {
    input.style.height = "";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    updateSendButtonState();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  document.getElementById("msgSendBtn").addEventListener("click", handleSend);

  document.getElementById("msgAttachBtn").addEventListener("click", () => {
    document.getElementById("msgFileInput").click();
  });
  document.getElementById("msgFileInput").addEventListener("change", (e) => {
    handleImageFile(e.target.files[0]);
  });
  document.getElementById("msgImagePreviewRemove").addEventListener("click", () => {
    msgState.pendingImage = null;
    document.getElementById("msgImagePreview").classList.remove("visible");
    document.getElementById("msgFileInput").value = "";
    updateSendButtonState();
  });

  window.addEventListener(MESSAGES_UPDATED_EVENT, () => {
    renderThreadList();
    if (msgState.activeId) renderPanel();
  });

  window.addEventListener(BLOCKED_USERS_UPDATED_EVENT, () => {
    renderThreadList();
    if (msgState.activeId) renderPanel();
  });

  window.addEventListener("marka:seller-typing", (e) => {
    if (e.detail.conversationId !== msgState.activeId) return;
    clearTimeout(msgState.typingTimer);
    setTimeout(showTyping, 500);
    msgState.typingTimer = setTimeout(hideTyping, e.detail.delay);
  });
});

// In case lucide loads after DOMContentLoaded (it's deferred), re-run icon creation.
window.addEventListener("load", refreshIcons);
