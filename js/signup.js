/* ============================================================================
   MARKA — Sign up page logic
   Validates name/email/password/confirm/terms client-side, then on "success"
   sends the new user on to verify-email.html — the same flow a real signup
   would kick off (mock, no backend, same pattern as js/login.js).
   ============================================================================ */

document.addEventListener("DOMContentLoaded", () => {
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

    runFakeSubmit(submitBtn, () => {
      toast.hidden = false;
      const email = encodeURIComponent(emailInput.value.trim());
      setTimeout(() => {
        window.location.href = `verify-email.html?email=${email}`;
      }, 700);
    });
  });

  [nameInput, emailInput, passwordInput, confirmInput].forEach((input, i) => {
    input.addEventListener("input", () => clearFieldError([nameGroup, emailGroup, passwordGroup, confirmGroup][i]));
  });

  termsInput.addEventListener("change", () => {
    if (termsInput.checked) clearFieldError(termsGroup);
  });
});
