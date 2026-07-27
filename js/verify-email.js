/* ============================================================================
   MARKA — Verify email page logic
   Reads ?email= off the URL (set by signup.js), wires the 6-box code input
   and 60s resend cooldown (js/auth.js), and verifies the code against
   Supabase Auth (supabaseClient.auth.verifyOtp). On success Supabase sets a
   real session, so the "Continue" step just goes to profile.html.
   ============================================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  if (await redirectIfAuthed()) return;

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
      codeError.style.display = "flex";
      return;
    }
    codeError.style.display = "none";

    if (!email) {
      codeError.textContent = "Missing email — go back to signup and try again.";
      codeError.style.display = "flex";
      return;
    }

    runFakeSubmit(submitBtn, async () => {
      const { error } = await supabaseClient.auth.verifyOtp({
        email,
        token: value,
        type: "signup",
      });

      if (error) {
        codeError.querySelector("span") ? (codeError.querySelector("span").textContent = authErrorMessage(error)) : (codeError.textContent = authErrorMessage(error));
        codeError.style.display = "flex";
        return;
      }

      codeView.hidden = true;
      verifiedView.hidden = false;
    });
  });

  document.getElementById("resendBtn").addEventListener("click", async () => {
    if (email) await supabaseClient.auth.resend({ type: "signup", email });
    resend.start();
    code.boxes.forEach((b) => {
      b.value = "";
      b.classList.remove("filled");
    });
    code.boxes[0].focus();
  });
});
