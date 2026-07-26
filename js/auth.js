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

/* ============================================================================
   Supabase-backed auth
   Real signup/login/logout/password-reset/email-verification, on top of
   supabaseClient from js/supabase-client.js (must be loaded first). Every
   function returns { data, error } — callers check `error` and use
   authErrorMessage() to show something readable in the existing
   .form-error / toast UI instead of Supabase's raw error text.
   ============================================================================ */

const MarkaAuth = {
  async signUp(email, password, fullName) {
    return supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
  },

  async signIn(email, password) {
    return supabaseClient.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    return supabaseClient.auth.signOut();
  },

  // Sends a 6-digit code to email (verify-email.html's #codeRow). This is
  // the same code Supabase's confirmation email carries as {{ .Token }}.
  async verifySignupOtp(email, token) {
    return supabaseClient.auth.verifyOtp({ email, token, type: "signup" });
  },

  async resendSignupOtp(email) {
    return supabaseClient.auth.resend({ type: "signup", email });
  },

  // Sends the "reset your password" email. redirectTo must be an absolute
  // URL to reset-password.html and must also be added to Supabase →
  // Authentication → URL Configuration → Redirect URLs.
  async sendPasswordReset(email) {
    return supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, "")}reset-password.html`,
    });
  },

  // Called on reset-password.html once Supabase has put a recovery session
  // in place (via the emailed link).
  async updatePassword(newPassword) {
    return supabaseClient.auth.updateUser({ password: newPassword });
  },

  async getSession() {
    const { data } = await supabaseClient.auth.getSession();
    return data.session;
  },

  async getCurrentUser() {
    const { data } = await supabaseClient.auth.getUser();
    return data.user;
  },

  onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange(callback);
  },
};

// Friendlier copy for the handful of Supabase auth errors users actually hit.
function authErrorMessage(error) {
  if (!error) return "";
  const msg = error.message || String(error);
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match our records.";
  if (/email not confirmed/i.test(msg)) return "Please verify your email before logging in.";
  if (/already registered|already exists/i.test(msg)) return "An account with that email already exists.";
  if (/password should be at least/i.test(msg)) return "Password must be at least 8 characters.";
  if (/rate limit/i.test(msg)) return "Too many attempts — please wait a moment and try again.";
  if (/token has expired|invalid token|otp_expired/i.test(msg)) return "That code is invalid or has expired. Request a new one.";
  return msg;
}

// Redirects to login.html (preserving the current page as ?next=) if there's
// no signed-in user. Call at the top of any page's DOMContentLoaded that
// requires auth (profile.html, sell.html, messages.html, etc.). Returns the
// user object on success so callers don't need a second getCurrentUser() call.
async function requireAuth() {
  const user = await MarkaAuth.getCurrentUser();
  if (!user) {
    const next = encodeURIComponent(window.location.pathname.split("/").pop());
    window.location.href = `login.html?next=${next}`;
    return null;
  }
  return user;
}
