/* ============================================================================
   MARKA — Verify email page logic
   Reads ?email= off the URL (set by signup.js) to personalize the copy and
   as the address to verify, wires the 6-box code input (js/auth.js
   initCodeInputs) to Supabase's verifyOtp (the code is the same one sent in
   the confirmation email as {{ .Token }}), a 60s resend cooldown that calls
   MarkaAuth.resendSignupOtp, and swaps in a success panel once verified.
   ============================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") ? decodeURIComponent(params.get("email")) : "";
  if (email) document.getElementById("targetEmail").textContent = email;

  const code = initCodeInputs("#codeRow");
  const resend = initResendTimer("#resendBtn", "#resendTimer", 60);
  resend.start();

  const form = document.getElementById("verifyForm");
  const codeError = document.getElementById("codeError");
  const submitBtn = document.getElementById("verifySubmitBtn");
  const codeView = document.getElementById("codeView");
  const verifiedView = document.getElementById("verifiedView");

  document.querySelector("#codeRow").addEventListener("codechange", () => {
    codeError.style.display = "none";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = code.getCode();
    if (value.length !== 6) {
      showCodeError("Enter all 6 digits.");
      return;
    }
    if (!email) {
      showCodeError("Missing email — go back to signup and try again.");
      return;
    }
    codeError.style.display = "none";

    runFakeSubmit(submitBtn, async () => {
      const { error } = await MarkaAuth.verifySignupOtp(email, value);
      if (error) {
        showCodeError(authErrorMessage(error));
        return;
      }
      codeView.hidden = true;
      verifiedView.hidden = false;
    }, 600);
  });

  document.getElementById("resendBtn").addEventListener("click", async () => {
    resend.start();
    code.boxes.forEach((b) => {
      b.value = "";
      b.classList.remove("filled");
    });
    code.boxes[0].focus();
    if (email) await MarkaAuth.resendSignupOtp(email);
  });

  function showCodeError(message) {
    const span = codeError.querySelector("span");
    if (span && message) span.textContent = message;
    codeError.style.display = "flex";
  }
});
