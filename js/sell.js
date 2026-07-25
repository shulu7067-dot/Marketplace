/* ============================================================================
   MARKA — Post an ad (sell) page
   Populates the category/condition selects, handles the photo picker (photos
   are read as data URLs so they survive a reload — see js/listings-store.js),
   supports saving/resuming drafts, editing or deleting an existing ad via
   ?edit=<id>, and previewing a listing before it's published. Everything is
   persisted to localStorage; swap the save/delete calls for real API calls
   once a backend exists.
   ============================================================================ */

const SELL_CATEGORIES = ["Vehicles", "Bikes", "Property", "Electronics", "Phones", "Other"];
const MAX_PHOTOS = 8;

let photos = []; // { url } — data URLs, so they persist through drafts/reloads
let editingId = null; // id of the user listing currently being edited, if any
let editingStatus = null; // "draft" | "published" — status of that listing when loaded

/* --------------------------------- Selects --------------------------------- */
function renderCategoryOptions() {
  const select = document.getElementById("adCategory");
  select.innerHTML =
    `<option value="" disabled selected>Choose a category</option>` +
    SELL_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");
}

function renderConditionOptions() {
  const select = document.getElementById("adCondition");
  const options = (window.BROWSE_CONDITION_OPTIONS || ["New", "Like new", "Used - good", "Used - fair"]).filter(
    (c) => c.toLowerCase() !== "any condition"
  );
  select.innerHTML =
    `<option value="" disabled selected>Choose a condition</option>` +
    options.map((c) => `<option value="${c}">${c}</option>`).join("");
}

/* --------------------------------- Photos --------------------------------- */
function renderPhotoGrid() {
  const grid = document.getElementById("photoGrid");
  const tiles = photos
    .map(
      (p, i) => `
    <div class="photo-tile photo-tile--filled" style="background-image:url('${p.url}')" data-photo-index="${i}">
      ${i === 0 ? `<span class="photo-tile-cover-tag">Cover</span>` : ""}
      <button type="button" class="photo-tile-remove" data-remove-index="${i}" aria-label="Remove photo">
        <i data-lucide="x"></i>
      </button>
    </div>`
    )
    .join("");

  const addTile =
    photos.length < MAX_PHOTOS
      ? `<button type="button" class="photo-tile photo-tile--cover" id="addPhotoTile">
          <i data-lucide="camera"></i>
          <span>Add photo</span>
        </button>`
      : "";

  grid.innerHTML = tiles + addTile;
  refreshIcons();

  const addBtn = document.getElementById("addPhotoTile");
  if (addBtn) addBtn.addEventListener("click", () => document.getElementById("photoInput").click());

  grid.querySelectorAll("[data-remove-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      photos.splice(Number(btn.dataset.removeIndex), 1);
      renderPhotoGrid();
    });
  });
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handlePhotoInput(e) {
  const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - photos.length);
  e.target.value = ""; // allow re-selecting the same file later
  const urls = await Promise.all(files.map(fileToDataURL));
  urls.forEach((url) => photos.push({ url }));
  renderPhotoGrid();
}

/* ------------------------------ Form <-> data ------------------------------ */
function gatherFormData() {
  return {
    id: editingId || undefined,
    title: document.getElementById("adTitle").value.trim(),
    category: document.getElementById("adCategory").value,
    condition: document.getElementById("adCondition").value,
    description: document.getElementById("adDescription").value.trim(),
    price: document.getElementById("adPrice").value,
    location: document.getElementById("adLocation").value.trim(),
    photos: photos.map((p) => p.url),
  };
}

function loadForEditing(id) {
  const item = getUserListing(id);
  if (!item) return;

  editingId = item.id;
  editingStatus = item.status;

  document.getElementById("adTitle").value = item.title || "";
  document.getElementById("adDescription").value = item.description || "";
  document.getElementById("adPrice").value = item.price || "";
  document.getElementById("adLocation").value = item.location || "";
  document.getElementById("adCategory").value = item.category || "";
  document.getElementById("adCondition").value = item.condition || "";

  photos = (item.photos || []).map((url) => ({ url }));
  renderPhotoGrid();

  document.getElementById("sellTitle").textContent = "Edit ad";
  document.getElementById("sellSubtitle").textContent =
    item.status === "draft"
      ? "Pick up where you left off — publish whenever you're ready."
      : "Update the details below and save your changes.";
  document.getElementById("publishBtn").innerHTML =
    item.status === "draft" ? `<i data-lucide="upload"></i> Post ad` : `<i data-lucide="check"></i> Save changes`;
  document.getElementById("deleteDraftBtn").hidden = false;
  document.getElementById("deleteDraftBtn").innerHTML =
    `<i data-lucide="trash-2"></i> ${item.status === "draft" ? "Delete this draft" : "Delete this ad"}`;
  refreshIcons();
}

/* --------------------------------- Toast --------------------------------- */
function showToast(message) {
  const toast = document.getElementById("sellToast");
  document.getElementById("sellToastText").textContent = message;
  toast.hidden = false;
  refreshIcons();
  toast.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ------------------------------- Save / publish ------------------------------- */
function handleSaveDraft() {
  const data = gatherFormData();
  const isEmpty = !data.title && !data.description && !data.price && !data.location && !photos.length;
  if (isEmpty) {
    showToast("Add a few details first, then save your draft.");
    return;
  }
  const saved = saveUserListing({ ...data, status: "draft" });
  editingId = saved.id;
  editingStatus = "draft";
  history.replaceState(null, "", `sell.html?edit=${saved.id}`);
  document.getElementById("sellTitle").textContent = "Edit ad";
  document.getElementById("deleteDraftBtn").hidden = false;
  document.getElementById("deleteDraftBtn").innerHTML = `<i data-lucide="trash-2"></i> Delete this draft`;
  refreshIcons();
  showToast("Draft saved — finish it anytime from your profile.");
}

function publishListing() {
  const form = document.getElementById("sellForm");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const data = gatherFormData();
  const wasPublished = editingStatus === "published";
  const saved = saveUserListing({ ...data, status: "published" });
  showToast(wasPublished ? "Changes saved." : "Your ad is live — buyers nearby can see it now.");
  setTimeout(() => {
    window.location.href = `listing.html?id=${saved.id}`;
  }, 900);
}

function handleSubmit(e) {
  e.preventDefault();
  publishListing();
}

async function handleDeleteListing() {
  if (!editingId) return;
  const confirmed = await confirmModal({
    title: editingStatus === "draft" ? "Delete this draft?" : "Delete this ad?",
    message: "This can't be undone.",
    confirmLabel: "Delete",
    danger: true,
  });
  if (!confirmed) return;
  deleteUserListing(editingId);
  window.location.href = "profile.html";
}

/* --------------------------------- Preview --------------------------------- */
function buildPreviewHTML(record) {
  const hasPhoto = typeof record.images[0] === "string";
  const mainStyle = hasPhoto
    ? `background-image:url('${record.images[0]}')`
    : `background:linear-gradient(135deg, ${record.grad[0]}, ${record.grad[1]})`;

  const thumbs = record.images
    .slice(0, 4)
    .map((img) => {
      const style =
        typeof img === "string" ? `background-image:url('${img}')` : `background:linear-gradient(135deg, ${img[0]}, ${img[1]})`;
      return `<div class="preview-thumb" style="${style}"></div>`;
    })
    .join("");

  const missing = [];
  if (!record.title || record.title === "Untitled ad") missing.push("a title");
  if (!record.price || record.price === "$0") missing.push("a price");
  if (record.condition === "—") missing.push("a condition");

  return `
    <div class="preview-media" style="${mainStyle}"></div>
    ${hasPhoto && record.images.length > 1 ? `<div class="preview-thumbs">${thumbs}</div>` : ""}
    <h3 class="listing-title" style="font-size:19px;margin-bottom:6px;">${record.title}</h3>
    ${priceStub(record.price)}
    <div class="preview-meta-row">
      <span><i data-lucide="map-pin"></i>${record.loc}</span>
      <span class="condition-badge"><i data-lucide="shield-check"></i>${record.condition}</span>
    </div>
    <p class="preview-desc">${record.description}</p>
    ${missing.length ? `<p class="preview-empty-note">Add ${missing.join(" and ")} before publishing.</p>` : ""}
  `;
}

function openPreview() {
  const data = gatherFormData();
  const record = userListingToRecord({ ...data, id: data.id || "preview", status: "published" });
  document.getElementById("previewBody").innerHTML = buildPreviewHTML(record);
  document.getElementById("previewModal").classList.add("open");
  refreshIcons();
}

function closePreview() {
  document.getElementById("previewModal").classList.remove("open");
}

/* ---------------------------------- Init ---------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderNavLinks("");
  renderBottomNav("sell");
  renderCategoryOptions();
  renderConditionOptions();
  renderPhotoGrid();

  const editId = new URLSearchParams(window.location.search).get("edit");
  if (editId) loadForEditing(editId);

  document.getElementById("photoInput").addEventListener("change", handlePhotoInput);
  document.getElementById("sellForm").addEventListener("submit", handleSubmit);
  document.getElementById("saveDraftBtn").addEventListener("click", handleSaveDraft);
  document.getElementById("deleteDraftBtn").addEventListener("click", handleDeleteListing);

  document.getElementById("previewBtn").addEventListener("click", openPreview);
  document.getElementById("previewModalClose").addEventListener("click", closePreview);
  document.getElementById("previewBackBtn").addEventListener("click", closePreview);
  document.getElementById("previewPublishBtn").addEventListener("click", () => {
    closePreview();
    publishListing();
  });
  document.getElementById("previewModal").addEventListener("click", (e) => {
    if (e.target.id === "previewModal") closePreview();
  });

  refreshIcons();
});
