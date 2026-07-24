/* ============================================================================
   MARKA — All categories page logic
   Renders one card per CATEGORY_DETAILS entry (js/categories-data.js) with
   its live listing count from LISTING_DETAILS, and sends the search bar to
   browse.html?q=… so this page's search behaves the same as everywhere else.
   ============================================================================ */

function renderAllCategoriesGrid() {
  const grid = document.getElementById("allCategoriesGrid");
  grid.innerHTML = CATEGORY_DETAILS.map((c) => {
    const count = getCategoryListingCount(c.label);
    return `
    <a class="category-full-card" href="category.html?slug=${c.slug}">
      <div class="category-full-icon" style="background:${c.bg}">
        <i data-lucide="${c.icon}" style="color:${c.color}"></i>
      </div>
      <div>
        <div class="category-full-label">${c.label}</div>
        <p class="category-full-desc">${c.description}</p>
      </div>
      <div class="category-full-count">
        <i data-lucide="tag"></i> ${count} listing${count === 1 ? "" : "s"}
      </div>
    </a>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavLinks("Categories");
  renderAllCategoriesGrid();
  renderBottomNav("search");
  refreshIcons();

  const searchInput = document.getElementById("categoriesSearch");
  searchInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = searchInput.value.trim();
    window.location.href = q ? `browse.html?q=${encodeURIComponent(q)}` : "browse.html";
  });

  document.addEventListener("click", (e) => {
    const tabBtn = e.target.closest("[data-tab]");
    if (tabBtn) {
      renderBottomNav(tabBtn.dataset.tab);
      refreshIcons();
    }
  });
});

window.addEventListener("load", refreshIcons);
