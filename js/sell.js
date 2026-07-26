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

/* --------------------------------- Currency --------------------------------- */
// The price field used to show a hardcoded "$" no matter what currency the
// seller actually uses. It now reflects whatever currency is selected/detected
// (Profile → Settings, or GPS/search-detected country) and stays in sync if
// that changes mid-session.
function renderPriceCurrency() {
  const code = getSelectedCurrency();
  document.getElementById("adPriceSymbol").textContent = currencySymbol(code);
  const hint = document.getElementById("adPriceCurrencyHint");
  if (hint) hint.textContent = `Enter the amount in ${code} — buyers will see it converted to their own currency.`;
}

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

/* ------------------------------ Location picker (modal) ------------------------------ */
// Facebook-style picker: a single "Location" trigger opens a modal containing
// a search box and a pannable map with a pin fixed to the centre of the
// viewport (see .location-modal-pin) — the location is whatever the map is
// centred on, not a draggable marker. province/city are still derived and
// stored (via findNearestCity) purely so existing listing data/filtering that
// expects those fields keeps working; nothing about them is shown in the UI.
let locModalMap = null;
let locModalMoveTimer = null;
let locModalSuppressMoveHandler = false; // true while we're panning programmatically (search/locate), not from a user drag

const sellLocation = { province: "", city: "", lat: null, lng: null, locationText: "" };
// Working copy edited while the modal is open; only copied into sellLocation on Apply.
let locDraft = { province: "", city: "", lat: null, lng: null, locationText: "" };

const DEFAULT_MAP_CENTER = { lat: 20, lng: 0 };
const DEFAULT_MAP_ZOOM = 2;

function updateLocationTrigger() {
  const btn = document.getElementById("openLocationModalBtn");
  const label = document.getElementById("locationTriggerText");
  const hiddenInput = document.getElementById("adLocation");
  if (sellLocation.locationText) {
    label.textContent = sellLocation.locationText;
    btn.classList.add("has-value");
  } else {
    label.textContent = "Add a location";
    btn.classList.remove("has-value");
  }
  hiddenInput.value = sellLocation.locationText || "";
}

function setLocModalStatus(message, kind) {
  const status = document.getElementById("locModalStatus");
  status.textContent = message || "";
  status.classList.remove("is-error", "is-success");
  if (kind) status.classList.add(kind === "error" ? "is-error" : "is-success");
}

function ensureLocModalMap(lat, lng, zoom) {
  if (typeof L === "undefined") return null;
  if (!locModalMap) {
    locModalMap = L.map("locModalMap", { scrollWheelZoom: true }).setView([lat, lng], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(locModalMap);
    // The pin is a fixed CSS overlay (always centred) — so the "location" is
    // simply wherever the map ends up centred after any pan/zoom.
    locModalMap.on("moveend", handleLocModalMoveEnd);
  } else {
    locModalMap.setView([lat, lng], zoom);
  }
  setTimeout(() => locModalMap.invalidateSize(), 50);
  return locModalMap;
}

async function handleLocModalMoveEnd() {
  if (locModalSuppressMoveHandler) return;
  const center = locModalMap.getCenter();
  locDraft.lat = center.lat;
  locDraft.lng = center.lng;
  setLocModalStatus("Updating location…");
  const reverse = await reverseGeocode(center.lat, center.lng);
  const realLabel = formatRealLocationLabel(reverse);
  const nearest = findNearestCity(center.lat, center.lng);
  const isNearbyMatch = nearest && nearest.distanceKm <= NEARBY_CITY_THRESHOLD_KM;

  locDraft.province = isNearbyMatch ? nearest.province : OTHER_PROVINCE_CODE;
  locDraft.city = isNearbyMatch ? nearest.city : "Other (enter below)";
  locDraft.locationText = realLabel || (isNearbyMatch ? `${nearest.city}, ${nearest.province}` : locDraft.locationText);

  setLocModalStatus(
    realLabel ? `Pin set: ${realLabel}` : isNearbyMatch ? `Pin set near ${nearest.city}, ${nearest.province}` : "Pin set."
  );

  if (reverse && reverse.countryCode && typeof applyDetectedCountry === "function") {
    applyDetectedCountry(reverse.countryCode);
  }
}

/* ------------------------------ Location search (inside modal) ------------------------------ */
let locationSearchResults = [];
let locationSearchTimer = null;
let locationSearchActiveIndex = -1;

function renderLocationSuggestions() {
  const list = document.getElementById("locModalSuggestions");
  if (!locationSearchResults.length) {
    list.hidden = true;
    list.innerHTML = "";
    return;
  }
  list.innerHTML = locationSearchResults
    .map(
      (r, i) => `
      <li data-index="${i}" class="${i === locationSearchActiveIndex ? "is-active" : ""}">
        <i data-lucide="map-pin"></i><span>${r.label}</span>
      </li>`
    )
    .join("");
  list.hidden = false;
  refreshIcons();
}

async function handleLocationInput(e) {
  const query = e.target.value;
  clearTimeout(locationSearchTimer);
  locationSearchActiveIndex = -1;
  if (query.trim().length < 3) {
    locationSearchResults = [];
    renderLocationSuggestions();
    return;
  }
  locationSearchTimer = setTimeout(async () => {
    locationSearchResults = await searchPlaces(query);
    renderLocationSuggestions();
  }, 350); // debounced so we don't hammer Nominatim on every keystroke
}

function selectLocationResult(result) {
  const nearest = findNearestCity(result.lat, result.lng);
  const isNearbyMatch = nearest && nearest.distanceKm <= NEARBY_CITY_THRESHOLD_KM;

  locDraft.province = isNearbyMatch ? nearest.province : OTHER_PROVINCE_CODE;
  locDraft.city = isNearbyMatch ? nearest.city : "Other (enter below)";
  locDraft.lat = result.lat;
  locDraft.lng = result.lng;
  locDraft.locationText = result.label;

  ensureLocModalMap(result.lat, result.lng, 14);
  setLocModalStatus(`Pin set: ${result.label}`, "success");

  if (result.countryCode && typeof applyDetectedCountry === "function") {
    applyDetectedCountry(result.countryCode);
  }

  locationSearchResults = [];
  renderLocationSuggestions();
}

function initLocationSearch() {
  const input = document.getElementById("locModalSearchInput");
  const list = document.getElementById("locModalSuggestions");

  input.addEventListener("input", handleLocationInput);

  input.addEventListener("keydown", (e) => {
    if (!locationSearchResults.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      locationSearchActiveIndex = Math.min(locationSearchActiveIndex + 1, locationSearchResults.length - 1);
      renderLocationSuggestions();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      locationSearchActiveIndex = Math.max(locationSearchActiveIndex - 1, 0);
      renderLocationSuggestions();
    } else if (e.key === "Enter" && locationSearchActiveIndex >= 0) {
      e.preventDefault();
      selectLocationResult(locationSearchResults[locationSearchActiveIndex]);
    } else if (e.key === "Escape") {
      locationSearchResults = [];
      renderLocationSuggestions();
    }
  });

  list.addEventListener("click", (e) => {
    const item = e.target.closest("li[data-index]");
    if (!item) return;
    selectLocationResult(locationSearchResults[Number(item.dataset.index)]);
  });

  document.addEventListener("click", (e) => {
    if (e.target === input || list.contains(e.target)) return;
    locationSearchResults = [];
    renderLocationSuggestions();
  });
}

/* ------------------------------ Locate-me (inside modal) ------------------------------ */
async function handleLocModalLocate() {
  const btn = document.getElementById("locModalLocateBtn");
  btn.classList.add("is-loading");
  setLocModalStatus("Locating…");

  try {
    const { lat, lng } = await requestUserLocation();
    btn.classList.add("is-active");
    ensureLocModalMap(lat, lng, 14);
    // ensureLocModalMap's setView fires moveend itself, which will reverse
    // geocode and update locDraft/status — nothing further needed here.
  } catch (err) {
    setLocModalStatus(userGeoState.error || "Couldn't get your location. Try searching above instead.", "error");
  } finally {
    btn.classList.remove("is-loading");
  }
}

/* ------------------------------ Modal open/close/apply ------------------------------ */
function openLocationModal() {
  // Start the draft from whatever's already committed, so re-opening the
  // modal (e.g. to tweak the pin) doesn't lose the previous selection.
  locDraft = { ...sellLocation };
  document.getElementById("locModalSearchInput").value = "";
  locationSearchResults = [];
  renderLocationSuggestions();
  setLocModalStatus(sellLocation.locationText ? `Pin set: ${sellLocation.locationText}` : "");

  document.getElementById("locationModal").classList.add("open");
  refreshIcons();

  const lat = sellLocation.lat ?? DEFAULT_MAP_CENTER.lat;
  const lng = sellLocation.lng ?? DEFAULT_MAP_CENTER.lng;
  const zoom = sellLocation.lat !== null ? 14 : DEFAULT_MAP_ZOOM;
  // setView on a freshly created map fires its own moveend before locDraft
  // above is meaningfully different, so suppress that first callback when we
  // already know exactly what the draft should be (i.e. we have a saved
  // location) to avoid an unnecessary reverse-geocode round trip on open.
  locModalSuppressMoveHandler = sellLocation.lat !== null;
  ensureLocModalMap(lat, lng, zoom);
  setTimeout(() => {
    locModalSuppressMoveHandler = false;
  }, 300);
}

function closeLocationModal() {
  document.getElementById("locationModal").classList.remove("open");
}

function applyLocationModal() {
  if (locDraft.lat === null || locDraft.lng === null) {
    setLocModalStatus("Search for a place or drag the map to drop a pin first.", "error");
    return;
  }
  sellLocation.province = locDraft.province;
  sellLocation.city = locDraft.city;
  sellLocation.lat = locDraft.lat;
  sellLocation.lng = locDraft.lng;
  sellLocation.locationText = locDraft.locationText;
  updateLocationTrigger();
  closeLocationModal();
}

function initLocationModal() {
  document.getElementById("openLocationModalBtn").addEventListener("click", openLocationModal);
  document.getElementById("locationModalClose").addEventListener("click", closeLocationModal);
  document.getElementById("locationModal").addEventListener("click", (e) => {
    if (e.target.id === "locationModal") closeLocationModal();
  });
  document.getElementById("locModalApplyBtn").addEventListener("click", applyLocationModal);
  document.getElementById("locModalLocateBtn").addEventListener("click", handleLocModalLocate);
  initLocationSearch();
}

// Keep the Leaflet canvas in sync with its container's actual size across
// resizes/orientation changes, same rationale as browse.js.
let locModalResizeTimer = null;
window.addEventListener("resize", () => {
  if (!locModalMap) return;
  clearTimeout(locModalResizeTimer);
  locModalResizeTimer = setTimeout(() => locModalMap.invalidateSize(), 150);
});

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
  const enteredPrice = Number(document.getElementById("adPrice").value) || 0;
  const currencyCode = getSelectedCurrency();
  const rate = (CURRENCIES[currencyCode] && CURRENCIES[currencyCode].rateFromUSD) || 1;
  // Every stored price is kept in the same internal USD baseline the rest of
  // the app already assumes (see formatPrice/parseUSDAmount) — otherwise a
  // price typed in Rand would get silently re-interpreted as that many US
  // dollars the moment anyone viewed it in a different currency.
  const usdPrice = enteredPrice / rate;

  return {
    id: editingId || undefined,
    title: document.getElementById("adTitle").value.trim(),
    category: document.getElementById("adCategory").value,
    condition: document.getElementById("adCondition").value,
    description: document.getElementById("adDescription").value.trim(),
    price: enteredPrice ? String(usdPrice) : "",
    location: sellLocation.locationText,
    province: sellLocation.province,
    city: sellLocation.city,
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
  const currencyCode = getSelectedCurrency();
  const rate = (CURRENCIES[currencyCode] && CURRENCIES[currencyCode].rateFromUSD) || 1;
  const storedUsdPrice = Number(item.price) || 0;
  document.getElementById("adPrice").value = storedUsdPrice ? Math.round(storedUsdPrice * rate) : "";
  document.getElementById("adCategory").value = item.category || "";
  document.getElementById("adCondition").value = item.condition || "";

  sellLocation.province = item.province || "";
  sellLocation.city = item.city || "";
  sellLocation.lat = typeof item.lat === "number" ? item.lat : null;
  sellLocation.lng = typeof item.lng === "number" ? item.lng : null;
  sellLocation.locationText = item.location || "";
  updateLocationTrigger();

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
  updateLocationTrigger();
  renderPriceCurrency();
  window.addEventListener("marka:currency-changed", renderPriceCurrency);

  const editId = new URLSearchParams(window.location.search).get("edit");
  if (editId) loadForEditing(editId);

  document.getElementById("photoInput").addEventListener("change", handlePhotoInput);
  document.getElementById("sellForm").addEventListener("submit", handleSubmit);
  document.getElementById("saveDraftBtn").addEventListener("click", handleSaveDraft);
  document.getElementById("deleteDraftBtn").addEventListener("click", handleDeleteListing);

  initLocationModal();

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
