/* ============================================================================
   MARKA — Login page logic
   Validates the two fields client-side, then hands off to runFakeSubmit()
   (js/auth.js) for the loading state + mock "success" redirect to profile.html.
   ============================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const emailGroup = document.getElementById("loginEmailGroup");
  const passwordGroup = document.getElementById("loginPasswordGroup");
  const submitBtn = document.getElementById("loginSubmitBtn");
  const toast = document.getElementById("loginToast");

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

    runFakeSubmit(submitBtn, () => {
      toast.hidden = false;
      setTimeout(() => {
        window.location.href = "profile.html";
      }, 700);
    });
  });

  [emailInput, passwordInput].forEach((input, i) => {
    input.addEventListener("input", () => clearFieldError([emailGroup, passwordGroup][i]));
  });
});
