/* ============================================================================
   MARKA — Verify email page logic
   Reads ?email= off the URL (set by signup.js) to personalize the copy,
   wires the 6-box code input (js/auth.js initCodeInputs), a 60s resend
   cooldown (js/auth.js initResendTimer), and swaps in a success panel once
   all 6 digits are entered and "verified".
   ============================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");
  if (email) document.getElementById("targetEmail").textContent = decodeURIComponent(email);

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
      codeError.style.display = "flex";
      return;
    }
    codeError.style.display = "none";

    runFakeSubmit(submitBtn, () => {
      codeView.hidden = true;
      verifiedView.hidden = false;
    });
  });

  document.getElementById("resendBtn").addEventListener("click", () => {
    resend.start();
    code.boxes.forEach((b) => {
      b.value = "";
      b.classList.remove("filled");
    });
    code.boxes[0].focus();
  });
});
