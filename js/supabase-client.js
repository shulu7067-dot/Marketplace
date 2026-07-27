/* ============================================================================
   MARKA — Supabase client + shared auth helpers
   Loaded (after the supabase-js CDN script, before any page script that needs
   auth) on: login.html, signup.html, verify-email.html, forgot-password.html,
   reset-password.html, profile.html.

   FILL THESE IN before the site will work:
   ----------------------------------------------------------------------------
   1. Create a project at https://supabase.com
   2. Run Supabase/0001 auth and profiles.sql in the SQL Editor
   3. Settings → API → copy your Project URL + anon public key below
   ---------------------------------------------------------------------------- */
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ------------------------------ Session helpers ------------------------------- */

// Returns the current session (or null) without redirecting anywhere.
async function getSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

// Call at the top of a page that REQUIRES a signed-in user (profile.html).
// Redirects to login.html (with a ?next= back-link) if there's no session.
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    const next = encodeURIComponent(window.location.pathname.split("/").pop());
    window.location.href = `login.html?next=${next}`;
    return null;
  }
  return session;
}

// Call at the top of login.html / signup.html so an already-signed-in
// visitor gets bounced straight to their profile instead of seeing the form.
async function redirectIfAuthed() {
  const session = await getSession();
  if (session) {
    window.location.href = "profile.html";
    return true;
  }
  return false;
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

// Turns a Supabase auth error into a short string safe to show under a
// specific field (falls back to a generic message for anything unexpected).
function authErrorMessage(error) {
  if (!error) return "";
  const msg = error.message || String(error);
  if (/already registered|already exists/i.test(msg)) return "An account with this email already exists.";
  if (/invalid login credentials/i.test(msg)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(msg)) return "Please verify your email before logging in.";
  if (/password should be at least/i.test(msg)) return "Password must be at least 8 characters.";
  if (/rate limit/i.test(msg)) return "Too many attempts — please wait a moment and try again.";
  return msg;
}
