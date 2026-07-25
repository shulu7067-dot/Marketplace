/* ============================================================================
   MARKA — Blog page logic
   Renders BLOG_POSTS (js/blog-data.js) as a card grid and opens a reader
   overlay (built on css/modal.css's .modal-overlay shell, same pattern as
   confirmModal() in js/common.js) with the full post when a card is clicked.
   ============================================================================ */

function formatBlogDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function renderBlogGrid() {
  const grid = document.getElementById("blogGrid");
  grid.innerHTML = BLOG_POSTS.map(
    (post) => `
    <button type="button" class="blog-card" data-post-id="${post.id}" aria-label="Read ${post.title}">
      <div class="blog-card-media" style="background:linear-gradient(135deg, ${post.grad[0]}, ${post.grad[1]})">
        <span class="blog-card-category">${post.category}</span>
      </div>
      <div class="blog-card-body">
        <h3 class="blog-card-title">${post.title}</h3>
        <p class="blog-card-excerpt">${post.excerpt}</p>
        <div class="blog-card-meta">
          <span><i data-lucide="calendar"></i>${formatBlogDate(post.date)}</span>
          <span><i data-lucide="clock"></i>${post.readMins} min read</span>
        </div>
      </div>
    </button>`
  ).join("");
}

function openBlogPost(id) {
  const post = BLOG_POSTS.find((p) => p.id === Number(id));
  if (!post) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal modal--wide" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h2 class="modal-title">${post.title}</h2>
        <button type="button" class="modal-close" aria-label="Close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="blog-reader-media" style="background:linear-gradient(135deg, ${post.grad[0]}, ${post.grad[1]})">
          <span class="blog-card-category">${post.category}</span>
        </div>
        <div class="blog-reader-meta">
          <span>${formatBlogDate(post.date)}</span>
          <span>·</span>
          <span>${post.readMins} min read</span>
        </div>
        <div class="blog-reader-body">
          ${post.body.map((p) => `<p>${p}</p>`).join("")}
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  refreshIcons();
  requestAnimationFrame(() => overlay.classList.add("open"));

  function close() {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 200);
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".modal-close")) close();
  });
}

document.addEventListener("click", (e) => {
  const card = e.target.closest("[data-post-id]");
  if (card) openBlogPost(card.dataset.postId);
});

document.addEventListener("DOMContentLoaded", () => {
  renderNavLinks("Blog");
  renderBottomNav("");
  renderBlogGrid();
  refreshIcons();
});
