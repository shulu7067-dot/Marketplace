/* ============================================================================
   MARKA — Login page logic
   Validates the two fields client-side, then signs in via Supabase Auth
   (js/supabase-client.js). Real session on success, inline field error on
   failure — no more fake timeout-then-redirect.
   ============================================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  if (await redirectIfAuthed()) return;

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

    runFakeSubmit(
      submitBtn,
      async () => {
        const { error } = await supabaseClient.auth.signInWithPassword({
          email: emailInput.value.trim(),
          password: passwordInput.value,
        });

        if (error) {
          setFieldError(passwordGroup, authErrorMessage(error));
          return;
        }

        toast.hidden = false;
        const params = new URLSearchParams(window.location.search);
        const next = params.get("next");
        setTimeout(() => {
          window.location.href = next && next !== "login.html" ? next : "profile.html";
        }, 500);
      },
      600
    );
  });

  [emailInput, passwordInput].forEach((input, i) => {
    input.addEventListener("input", () => clearFieldError([emailGroup, passwordGroup][i]));
  });
});
