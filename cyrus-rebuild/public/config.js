/* Cyrus browser configuration. The Supabase publishable key is public by design.
   Never put service-role keys or provider API secrets into browser code. */
window.CYRUS_CONFIG = {
  supabaseUrl: localStorage.getItem("cyrus-supabase-url") || "https://husydmiujigyonlxbuuj.supabase.co",
  supabaseAnonKey: localStorage.getItem("cyrus-supabase-anon-key") || "sb_publishable_zzAitNIGOutgaS5EGZKfrQ_osRrlu8U",
  features: { conversations: true, memory: false, imageGeneration: false, voiceInput: false }
};
const params = new URLSearchParams(window.location.search);
if (params.has("supabaseUrl")) {
  window.CYRUS_CONFIG.supabaseUrl = params.get("supabaseUrl");
  localStorage.setItem("cyrus-supabase-url", params.get("supabaseUrl"));
}
if (params.has("supabaseAnonKey")) {
  window.CYRUS_CONFIG.supabaseAnonKey = params.get("supabaseAnonKey");
  localStorage.setItem("cyrus-supabase-anon-key", params.get("supabaseAnonKey"));
}
