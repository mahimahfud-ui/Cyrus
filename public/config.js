/* Cyrus browser configuration.
   The Supabase publishable key is public by design; never place service-role
   keys or AI-provider secrets in browser code. */
(() => {
  "use strict";
  const DEFAULT_SUPABASE_URL = "https://rpjqghibyzfldqlrxfna.supabase.co";
  const DEFAULT_PUBLISHABLE_KEY = "sb_publishable_yHJ0gMPyT2zFJShlkLxb6A_07mOQv3-";
  const CONFIG_VERSION = "cyrus-supabase-2026-10-v2";
  const safeGet = (key) => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const safeSet = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  const params = new URLSearchParams(window.location.search);
  const useSavedSettings = safeGet("cyrus-config-version") === CONFIG_VERSION;
  const explicitUrl = params.get("supabaseUrl");
  const explicitKey = params.get("supabaseAnonKey");

  window.CYRUS_CONFIG = {
    supabaseUrl: explicitUrl || (useSavedSettings ? safeGet("cyrus-supabase-url") : null) || DEFAULT_SUPABASE_URL,
    supabaseAnonKey: explicitKey || (useSavedSettings ? safeGet("cyrus-supabase-anon-key") : null) || DEFAULT_PUBLISHABLE_KEY,
    features: { conversations: true, memory: false, imageGeneration: false, voiceInput: false }
  };
  if (explicitUrl) safeSet("cyrus-supabase-url", explicitUrl);
  if (explicitKey) safeSet("cyrus-supabase-anon-key", explicitKey);
  if (explicitUrl || explicitKey) safeSet("cyrus-config-version", CONFIG_VERSION);
})();
