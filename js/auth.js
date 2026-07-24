/* ============================================================================
   MARKA — Auth pages logic
   Shared across login.html / signup.html / forgot-password.html /
   verify-email.html. There's no backend, so "submitting" a form here just
   validates the fields, shows a brief fake-loading state on the button, then
   either reveals a success panel or redirects — the same mock-data spirit as
   the rest of the site (js/script.js, js/sell.js).
   ============================================================================ */

/* ------------------------------ Validation helpers --------------------------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(groupEl, message) {
  if (!groupEl) return;
  groupEl.classList.add("has-error");
  const err = groupEl.querySelector(".form-error");
  if (err && message) err.querySelector("span")?.replaceChildren(document.createTextNode(message));
}

function clearFieldError(groupEl) {
  if (!groupEl) return;
  groupEl.classList.remove("has-error");
}

function clearAllErrors(form) {
  form.querySelectorAll(".form-group.has-error").forEach((g) => g.classList.remove("has-error"));
}

/* ------------------------------ Password toggle ------------------------------- */
// Any button with [data-toggle-password] flips the type of the input inside
// its own .auth-field wrapper between "password" and "text".
function initPasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const field = btn.closest(".auth-field");
      const input = field?.querySelector("input");
      if (!input) return;
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      const icon = btn.querySelector("i");
      if (icon) icon.setAttribute("data-lucide", showing ? "eye" : "eye-off");
      refreshIcons();
    });
  });
}

/* ------------------------------ Fake submit / loading -------------------------- */
// Puts a submit button into its spinner state, waits a beat (simulating a
// network round trip), then calls onDone(). Used by every auth form so the
// interaction feels real without an actual backend.
function runFakeSubmit(button, onDone, delay = 900) {
  if (!button || button.classList.contains("is-loading")) return;
  button.classList.add("is-loading");
  button.disabled = true;
  setTimeout(() => {
    button.classList.remove("is-loading");
    button.disabled = false;
    onDone();
  }, delay);
}

/* ---------------------------------- Code input --------------------------------- */
// Wires a row of single-character .code-box inputs: typing a digit auto-
// advances to the next box, Backspace on an empty box moves back, and
// pasting a full code fills every box at once. Returns the current code as a
// string on demand via getCode().
function initCodeInputs(rowSelector) {
  const row = document.querySelector(rowSelector);
  if (!row) return { getCode: () => "" };
  const boxes = Array.from(row.querySelectorAll(".code-box"));

  boxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/[^0-9]/g, "").slice(-1);
      box.classList.toggle("filled", box.value !== "");
      if (box.value && boxes[i + 1]) boxes[i + 1].focus();
      row.dispatchEvent(new CustomEvent("codechange"));
    });
    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && boxes[i - 1]) {
        boxes[i - 1].focus();
      }
    });
    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const digits = (e.clipboardData.getData("text").match(/\d/g) || []).slice(0, boxes.length);
      digits.forEach((d, j) => {
        if (boxes[j]) {
          boxes[j].value = d;
          boxes[j].classList.add("filled");
        }
      });
      const next = boxes[digits.length] || boxes[boxes.length - 1];
      next.focus();
      row.dispatchEvent(new CustomEvent("codechange"));
    });
  });

  if (boxes[0]) boxes[0].focus();

  return { getCode: () => boxes.map((b) => b.value).join(""), boxes };
}

/* --------------------------------- Resend timer --------------------------------- */
// Disables a "Resend code" button for `seconds`, counting down inside it,
// then re-enables it. Returns a start() function so callers can restart the
// countdown after a resend click.
function initResendTimer(buttonSelector, timerSelector, seconds = 60) {
  const btn = document.querySelector(buttonSelector);
  const timerEl = document.querySelector(timerSelector);
  if (!btn) return { start: () => {} };
  let remaining = seconds;
  let interval = null;

  function tick() {
    remaining -= 1;
    if (timerEl) timerEl.textContent = `(${remaining}s)`;
    if (remaining <= 0) {
      clearInterval(interval);
      interval = null;
      btn.disabled = false;
      if (timerEl) timerEl.textContent = "";
    }
  }

  function start() {
    remaining = seconds;
    btn.disabled = true;
    if (timerEl) timerEl.textContent = `(${remaining}s)`;
    if (interval) clearInterval(interval);
    interval = setInterval(tick, 1000);
  }

  return { start };
}

document.addEventListener("DOMContentLoaded", () => {
  initPasswordToggles();
});

window.addEventListener("load", () => {
  if (window.lucide) window.lucide.createIcons();
});
