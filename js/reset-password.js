/* ============================================================================
   MARKA — Reset password page logic
   Landing page for the link in Supabase's password-reset email. Supabase
   (detectSessionInUrl: true, set in js/supabase-client.js) reads the
   recovery token out of the URL on load and turns it into a real session,
   which is what lets updateUser({ password }) work below.
   ============================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetForm");
  const passwordInput = document.getElementById("resetPassword");
  const confirmInput = document.getElementById("resetConfirm");
  const passwordGroup = document.getElementById("resetPasswordGroup");
  const confirmGroup = document.getElementById("resetConfirmGroup");
  const submitBtn = document.getElementById("resetSubmitBtn");
  const invalidToast = document.getElementById("resetInvalidToast");
  const requestView = document.getElementById("requestView");
  const successView = document.getElementById("successView");

  // If Supabase couldn't establish a recovery session (expired/used link),
  // there's nothing useful the form can do — say so up front.
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") invalidToast.hidden = true;
  });

  setTimeout(async () => {
    const session = await MarkaAuth.getSession();
    if (!session) invalidToast.hidden = false;
  }, 1200);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearAllErrors(form);

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
      const { error } = await MarkaAuth.updatePassword(passwordInput.value);
      if (error) {
        setFieldError(passwordGroup, authErrorMessage(error));
        return;
      }
      requestView.hidden = true;
      successView.hidden = false;
    }, 600);
  });

  [passwordInput, confirmInput].forEach((input, i) => {
    input.addEventListener("input", () => clearFieldError([passwordGroup, confirmGroup][i]));
  });
});
