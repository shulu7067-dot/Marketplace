/* ============================================================================
   MARKA — Sign up page logic
   Validates name/email/password/confirm/terms client-side, then creates a
   real Supabase Auth account. If email confirmation is ON in your Supabase
   project, sends the user to verify-email.html; if it's OFF, Supabase
   returns a session immediately and we skip straight to the profile.
   ============================================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  if (await redirectIfAuthed()) return;

  const form = document.getElementById("signupForm");
  const nameInput = document.getElementById("signupName");
  const emailInput = document.getElementById("signupEmail");
  const passwordInput = document.getElementById("signupPassword");
  const confirmInput = document.getElementById("signupConfirm");
  const termsInput = document.getElementById("signupTerms");

  const nameGroup = document.getElementById("signupNameGroup");
  const emailGroup = document.getElementById("signupEmailGroup");
  const passwordGroup = document.getElementById("signupPasswordGroup");
  const confirmGroup = document.getElementById("signupConfirmGroup");
  const termsGroup = document.getElementById("signupTermsGroup");

  const submitBtn = document.getElementById("signupSubmitBtn");
  const toast = document.getElementById("signupToast");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearAllErrors(form);

    let valid = true;
    if (!nameInput.value.trim()) {
      setFieldError(nameGroup);
      valid = false;
    }
    if (!EMAIL_RE.test(emailInput.value.trim())) {
      setFieldError(emailGroup);
      valid = false;
    }
    if (passwordInput.value.length < 8) {
      setFieldError(passwordGroup);
      valid = false;
    }
    if (!confirmInput.value || confirmInput.value !== passwordInput.value) {
      setFieldError(confirmGroup);
      valid = false;
    }
    if (!termsInput.checked) {
      setFieldError(termsGroup);
      valid = false;
    }
    if (!valid) return;

    runFakeSubmit(
      submitBtn,
      async () => {
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();

        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password: passwordInput.value,
          options: { data: { full_name: name } },
        });

        if (error) {
          setFieldError(emailGroup, authErrorMessage(error));
          return;
        }

        toast.hidden = false;
        const encodedEmail = encodeURIComponent(email);

        setTimeout(() => {
          // If Supabase already returned a session, email confirmation is
          // OFF for this project — the account is ready to use right away.
          if (data.session) {
            window.location.href = "profile.html";
          } else {
            window.location.href = `verify-email.html?email=${encodedEmail}`;
          }
        }, 700);
      },
      900
    );
  });

  [nameInput, emailInput, passwordInput, confirmInput].forEach((input, i) => {
    input.addEventListener("input", () => clearFieldError([nameGroup, emailGroup, passwordGroup, confirmGroup][i]));
  });

  termsInput.addEventListener("change", () => {
    if (termsInput.checked) clearFieldError(termsGroup);
  });
});
