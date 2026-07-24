/* ============================================================================
   MARKA — Post an ad (sell) page
   Populates the category/condition selects, handles the photo picker (local
   preview only — nothing is uploaded anywhere), and shows a confirmation
   toast on submit. No backend: swap the submit handler for a real API call
   once one exists.
   ============================================================================ */

const SELL_CATEGORIES = ["Vehicles", "Bikes", "Property", "Electronics", "Phones", "Other"];
const MAX_PHOTOS = 8;

let photos = []; // { url } — object URLs for locally-picked files, preview only

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
      const idx = Number(btn.dataset.removeIndex);
      URL.revokeObjectURL(photos[idx].url);
      photos.splice(idx, 1);
      renderPhotoGrid();
    });
  });
}

function handlePhotoInput(e) {
  const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - photos.length);
  files.forEach((file) => photos.push({ url: URL.createObjectURL(file) }));
  e.target.value = ""; // allow re-selecting the same file later
  renderPhotoGrid();
}

/* --------------------------------- Submit --------------------------------- */
function handleSubmit(e) {
  e.preventDefault();
  const toast = document.getElementById("sellToast");
  const toastText = document.getElementById("sellToastText");
  toastText.textContent = "Your ad is live — buyers nearby can see it now.";
  toast.hidden = false;
  refreshIcons();
  toast.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function handleSaveDraft() {
  const toast = document.getElementById("sellToast");
  const toastText = document.getElementById("sellToastText");
  toastText.textContent = "Draft saved.";
  toast.hidden = false;
  refreshIcons();
}

/* ---------------------------------- Init ---------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderNavLinks("");
  renderBottomNav("sell");
  renderCategoryOptions();
  renderConditionOptions();
  renderPhotoGrid();

  document.getElementById("photoInput").addEventListener("change", handlePhotoInput);
  document.getElementById("sellForm").addEventListener("submit", handleSubmit);
  document.getElementById("saveDraftBtn").addEventListener("click", handleSaveDraft);

  refreshIcons();
});
