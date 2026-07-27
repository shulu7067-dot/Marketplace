/* ============================================================================
   MARKA — Forgot password page logic
   Validates the email, sends a REAL Supabase password-reset email (link
   points at reset-password.html), then swaps the request form for a success
   panel that echoes back the address it was sent to.
   ============================================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  if (await redirectIfAuthed()) return;

  const form = document.getElementById("forgotForm");
  const emailInput = document.getElementById("forgotEmail");
  const emailGroup = document.getElementById("forgotEmailGroup");
  const submitBtn = document.getElementById("forgotSubmitBtn");

  const requestView = document.getElementById("requestView");
  const successView = document.getElementById("successView");
  const sentToEmail = document.getElementById("sentToEmail");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearAllErrors(form);

    if (!EMAIL_RE.test(emailInput.value.trim())) {
      setFieldError(emailGroup);
      return;
    }

    runFakeSubmit(submitBtn, async () => {
      const email = emailInput.value.trim();
      const redirectTo = `${window.location.origin}${window.location.pathname.replace(/forgot-password\.html$/, "reset-password.html")}`;

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });

      // Don't reveal whether the email exists — show success either way,
      // unless it's a hard error (bad format, rate limit, etc).
      if (error && !/user not found/i.test(error.message || "")) {
        setFieldError(emailGroup, authErrorMessage(error));
        return;
      }

      sentToEmail.textContent = email;
      requestView.hidden = true;
      successView.hidden = false;
    });
  });

  emailInput.addEventListener("input", () => clearFieldError(emailGroup));

  document.getElementById("tryAnotherBtn").addEventListener("click", () => {
    successView.hidden = true;
    requestView.hidden = false;
    emailInput.value = "";
    emailInput.focus();
  });
});
