/* ============================================================================
   MARKA — Login page logic
   Validates the two fields client-side, then signs in against Supabase Auth
   (js/supabase-client.js + MarkaAuth from js/auth.js). "Keep me logged in on
   this device" toggles whether the session persists across browser restarts
   (localStorage) or ends when the tab closes (sessionStorage) — Supabase
   itself always persists to whichever storage the client was built with, so
   we just point supabaseClient at the right one before signing in.
   ============================================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const emailGroup = document.getElementById("loginEmailGroup");
  const passwordGroup = document.getElementById("loginPasswordGroup");
  const submitBtn = document.getElementById("loginSubmitBtn");
  const toast = document.getElementById("loginToast");

  // Already signed in? Skip straight past the form.
  const existing = await MarkaAuth.getCurrentUser();
  if (existing) {
    window.location.href = nextUrlOr("profile.html");
    return;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearAllErrors(form);

    let valid = true;
    if (!EMAIL_RE.test(emailInput.value.trim())) {
      setFieldError(emailGroup);
      valid = false;
    }
    if (!passwordInput.value) {
      setFieldError(passwordGroup);
      valid = false;
    }
    if (!valid) return;

    runFakeSubmit(submitBtn, async () => {
      const { error } = await MarkaAuth.signIn(emailInput.value.trim(), passwordInput.value);

      if (error) {
        setFieldError(passwordGroup, authErrorMessage(error));
        return;
      }

      toast.hidden = false;
      setTimeout(() => {
        window.location.href = nextUrlOr("profile.html");
      }, 700);
    }, 600);
  });

  [emailInput, passwordInput].forEach((input, i) => {
    input.addEventListener("input", () => clearFieldError([emailGroup, passwordGroup][i]));
  });
});

// Sends the user back to wherever requireAuth() bounced them from
// (login.html?next=sell.html), falling back to the profile page.
function nextUrlOr(fallback) {
  const next = new URLSearchParams(window.location.search).get("next");
  return next ? decodeURIComponent(next) : fallback;
}
