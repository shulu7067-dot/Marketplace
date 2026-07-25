/* ============================================================================
   MARKA — Forgot password page logic
   Validates the email, "sends" a fake reset link (loading state via
   runFakeSubmit), then swaps the request form for a success panel that
   echoes back the address it was sent to.
   ============================================================================ */

document.addEventListener("DOMContentLoaded", () => {
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

    runFakeSubmit(submitBtn, () => {
      sentToEmail.textContent = emailInput.value.trim();
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
