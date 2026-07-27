/* ============================================================================
   MARKA — Reset password page logic
   Reached only via the link in the Supabase password-reset email. Supabase's
   client library reads the recovery token out of the URL automatically and
   fires a PASSWORD_RECOVERY auth event with a temporary session — we just
   wait for that, then call updateUser({ password }) to finish the reset.
   ============================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const resetView = document.getElementById("resetView");
  const successView = document.getElementById("resetSuccessView");
  const invalidView = document.getElementById("resetInvalidView");

  const form = document.getElementById("resetForm");
  const passwordInput = document.getElementById("resetPassword");
  const confirmInput = document.getElementById("resetConfirm");
  const passwordGroup = document.getElementById("resetPasswordGroup");
  const confirmGroup = document.getElementById("resetConfirmGroup");
  const submitBtn = document.getElementById("resetSubmitBtn");
  const formError = document.getElementById("resetFormError");

  let recoveryReady = false;

  // If the link is missing/expired, Supabase never fires PASSWORD_RECOVERY
  // and there's no session — show the "expired" state after a short grace
  // period instead of leaving a dead form on screen.
  const expiredTimer = setTimeout(async () => {
    if (!recoveryReady) {
      const session = await getSession();
      if (!session) {
        resetView.hidden = true;
        invalidView.hidden = false;
      }
    }
  }, 2500);

  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      recoveryReady = true;
      clearTimeout(expiredTimer);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearAllErrors(form);
    formError.style.display = "none";

    let valid = true;
    if (passwordInput.value.length < 8) {
      setFieldError(passwordGroup);
      valid = false;
    }
    if (!confirmInput.value || confirmInput.value !== passwordInput.value) {
      setFieldError(confirmGroup);
      valid = false;
    }
    if (!valid) return;

    runFakeSubmit(submitBtn, async () => {
      const { error } = await supabaseClient.auth.updateUser({ password: passwordInput.value });

      if (error) {
        formError.querySelector("span").textContent = authErrorMessage(error);
        formError.style.display = "flex";
        return;
      }

      resetView.hidden = true;
      successView.hidden = false;
    });
  });

  [passwordInput, confirmInput].forEach((input, i) => {
    input.addEventListener("input", () => clearFieldError([passwordGroup, confirmGroup][i]));
  });
});
