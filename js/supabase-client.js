/* ============================================================================
   MARKA — Supabase client
   Loaded (via the supabase-js CDN script) before every other Marka script on
   pages that need auth or data: login, signup, forgot/reset password,
   verify-email, profile, and — in later parts — sell/browse/messages/etc.

   Fill in SUPABASE_URL and SUPABASE_ANON_KEY below from your project's
   Settings → API page. The anon key is safe to expose in client code — it's
   what Row Level Security (see supabase/migrations) is for.
   ============================================================================ */

const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

if (SUPABASE_URL.includes("YOUR-PROJECT-REF") && window.location.hostname !== "localhost") {
  console.warn("[Marka] supabase-client.js still has placeholder credentials — update SUPABASE_URL / SUPABASE_ANON_KEY.");
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
