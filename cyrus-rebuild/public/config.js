/* Cyrus — FULLY UNLOCKED config.
   Fill in your Supabase project URL + anon key below.
   Provider API keys must stay in Supabase Edge Function secrets only. */

window.CYRUS_CONFIG = {
  // Example (replace with your real values):
  // supabaseUrl: "https://xxxxxxxx.supabase.co",
  // supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  supabaseUrl: "",
  supabaseAnonKey: "",
  features: {
    conversations: true,
    memory: true,
    imageGeneration: true,   // still gated by ENABLE_PAID_IMAGE_GENERATION on server
    voiceInput: true
  },
  unlocked: true
};
