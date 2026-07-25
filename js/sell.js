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

/* ------------------------------ Location / map ------------------------------ */
let sellMap = null;
let sellMapMarker = null;
const sellLocation = { province: "", city: "", lat: null, lng: null };

function renderProvinceOptions() {
  const select = document.getElementById("adProvince");
  select.innerHTML =
    `<option value="" disabled ${sellLocation.province ? "" : "selected"}>Choose a province/state</option>` +
    getProvinceOptions().map((p) => `<option value="${p.code}">${p.name}</option>`).join("");
  select.value = sellLocation.province || "";
}

function renderCityOptions() {
  const select = document.getElementById("adCity");
  const cities = sellLocation.province ? getCityOptions(sellLocation.province) : [];
  select.innerHTML =
    `<option value="" disabled ${sellLocation.city ? "" : "selected"}>Choose a city</option>` +
    cities.map((c) => `<option value="${c}">${c}</option>`).join("");
  select.value = sellLocation.city || "";
  select.disabled = !sellLocation.province;
}

function syncLocationText() {
  const p = findProvince(sellLocation.province);
  if (sellLocation.city && p) {
    document.getElementById("adLocation").value = `${sellLocation.city}, ${p.code}`;
  }
}

function ensureSellMap(lat, lng) {
  if (typeof L === "undefined") return null;
  document.getElementById("formMapWrap").hidden = false;
  if (!sellMap) {
    sellMap = L.map("sellMap", { scrollWheelZoom: false }).setView([lat, lng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(sellMap);
    sellMapMarker = L.marker([lat, lng], { draggable: true }).addTo(sellMap);
    sellMapMarker.on("dragend", () => {
      const pos = sellMapMarker.getLatLng();
      sellLocation.lat = pos.lat;
      sellLocation.lng = pos.lng;
      const nearest = findNearestCity(pos.lat, pos.lng);
      if (nearest) {
        document.getElementById("gpsStatus").textContent = `Pin set near ${nearest.city}, ${nearest.province}`;
        document.getElementById("gpsStatus").classList.remove("is-error");
      }
    });
  } else {
    sellMap.setView([lat, lng], 12);
    sellMapMarker.setLatLng([lat, lng]);
  }
  setTimeout(() => sellMap.invalidateSize(), 50);
  return sellMap;
}

function applyLocation({ province, city, lat, lng, statusMessage }) {
  sellLocation.province = province || sellLocation.province;
  sellLocation.city = city || sellLocation.city;
  sellLocation.lat = typeof lat === "number" ? lat : sellLocation.lat;
  sellLocation.lng = typeof lng === "number" ? lng : sellLocation.lng;
  renderProvinceOptions();
  renderCityOptions();
  syncLocationText();
  if (sellLocation.lat !== null && sellLocation.lng !== null) ensureSellMap(sellLocation.lat, sellLocation.lng);
  const statusEl = document.getElementById("gpsStatus");
  if (statusMessage) {
    statusEl.textContent = statusMessage;
    statusEl.classList.remove("is-error");
    statusEl.classList.add("is-success");
  }
  refreshIcons();
}

async function handleUseGps() {
  const btn = document.getElementById("useGpsBtn");
  const label = document.getElementById("useGpsLabel");
  const status = document.getElementById("gpsStatus");
  status.classList.remove("is-error", "is-success");
  label.textContent = "Locating…";
  btn.disabled = true;

  try {
    const { lat, lng } = await requestUserLocation();
    btn.classList.add("active");

    // Best-effort human-readable place name via Nominatim; either way we
    // snap to the nearest seeded city so province/city filters stay in sync.
    const reverse = await reverseGeocode(lat, lng);
    const nearest = findNearestCity(lat, lng);

    if (nearest) {
      applyLocation({
        province: nearest.province,
        city: nearest.city,
        lat,
        lng,
        statusMessage: reverse && reverse.display ? `Located: ${reverse.city || nearest.city}, ${nearest.province}` : `Located near ${nearest.city}, ${nearest.province}`,
      });
    } else {
      applyLocation({ lat, lng, statusMessage: "Location found — drag the pin to fine-tune it." });
    }
  } catch (err) {
    status.classList.add("is-error");
    status.textContent = userGeoState.error || "Couldn't get your location. You can still pick a province/city below.";
  } finally {
    label.textContent = "Use my current location";
    btn.disabled = false;
  }
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
    province: sellLocation.province || document.getElementById("adProvince").value,
    city: sellLocation.city || document.getElementById("adCity").value,
    lat: sellLocation.lat,
    lng: sellLocation.lng,
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

  sellLocation.province = item.province || "";
  sellLocation.city = item.city || "";
  sellLocation.lat = typeof item.lat === "number" ? item.lat : null;
  sellLocation.lng = typeof item.lng === "number" ? item.lng : null;
  renderProvinceOptions();
  renderCityOptions();
  if (sellLocation.lat !== null && sellLocation.lng !== null) ensureSellMap(sellLocation.lat, sellLocation.lng);

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
  renderProvinceOptions();
  renderCityOptions();

  const editId = new URLSearchParams(window.location.search).get("edit");
  if (editId) loadForEditing(editId);

  document.getElementById("photoInput").addEventListener("change", handlePhotoInput);
  document.getElementById("sellForm").addEventListener("submit", handleSubmit);
  document.getElementById("saveDraftBtn").addEventListener("click", handleSaveDraft);
  document.getElementById("deleteDraftBtn").addEventListener("click", handleDeleteListing);

  document.getElementById("adProvince").addEventListener("change", (e) => {
    sellLocation.province = e.target.value;
    sellLocation.city = "";
    renderCityOptions();
  });

  document.getElementById("adCity").addEventListener("change", (e) => {
    const coords = getCityCoords(sellLocation.province, e.target.value);
    applyLocation({ city: e.target.value, lat: coords ? coords.lat : null, lng: coords ? coords.lng : null });
  });

  document.getElementById("useGpsBtn").addEventListener("click", handleUseGps);

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
