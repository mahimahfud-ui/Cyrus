/* Cyrus is intentionally shipped with no AI provider connected.
   Clear any old local Supabase values so this deployment starts fresh.
   Provider keys must never be stored in browser code. */
try {
  localStorage.removeItem("cyrus-supabase-url");
  localStorage.removeItem("cyrus-supabase-anon-key");
} catch (_) {}

window.CYRUS_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  features: {
    conversations: false,
    memory: false,
    imageGeneration: false,
    voiceInput: false
  }
};
