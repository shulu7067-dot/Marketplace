/* ============================================================================
   MARKA — Contact page logic
   Client-side-only contact form (no backend to send to). Validates with the
   native form.checkValidity()/reportValidity() pattern js/sell.js already
   uses, then shows a success overlay built on css/modal.css's .modal-overlay
   shell and resets the form. Nothing is persisted or actually sent.
   ============================================================================ */

function showContactSuccess(name) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h2 class="modal-title">Message sent</h2>
        <button type="button" class="modal-close" aria-label="Close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="contact-success-icon"><i data-lucide="check"></i></div>
        <p class="contact-success-text">Thanks${name ? `, ${name}` : ""} — our support team will get back to you within one business day.</p>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-primary" data-action="close" style="flex:1;">Done</button>
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
    if (e.target === overlay || e.target.closest(".modal-close") || e.target.closest("[data-action='close']")) close();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavLinks("Contact");
  renderBottomNav("");
  refreshIcons();

  const form = document.getElementById("contactForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const name = document.getElementById("contactName").value.trim();
    showContactSuccess(name);
    form.reset();
  });
});
