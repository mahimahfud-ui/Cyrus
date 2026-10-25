/* CYRUS - Public browser configuration only
   These values are designed to be public and safe to expose in the frontend.
   
   SECURITY: Never place provider API keys (Grok, ChatGPT), Supabase service-role 
   keys, or any private credentials in this file.
   
   To configure Cyrus:
   1. Set up a Supabase project at https://supabase.com
   2. Get your ANON KEY (not service role key) from Project Settings → API Keys
   3. Add your Supabase URL and ANON KEY below
   4. All AI provider integration happens in provider-adapter.js via backend proxy
*/

window.CYRUS_CONFIG = {
  // Supabase configuration for authentication and conversation storage
  supabaseUrl: localStorage.getItem("cyrus-supabase-url") || "",
  supabaseAnonKey: localStorage.getItem("cyrus-supabase-anon-key") || "",
  
  // Feature flags
  features: {
    conversations: true,
    memory: false,  // Not yet implemented
    imageGeneration: false,  // Not yet implemented
    voiceInput: false  // Not yet implemented
  }
};

// Override config from URL parameters if provided
const params = new URLSearchParams(window.location.search);
if (params.has("supabaseUrl")) {
  window.CYRUS_CONFIG.supabaseUrl = params.get("supabaseUrl");
  localStorage.setItem("cyrus-supabase-url", params.get("supabaseUrl"));
}
if (params.has("supabaseAnonKey")) {
  window.CYRUS_CONFIG.supabaseAnonKey = params.get("supabaseAnonKey");
  localStorage.setItem("cyrus-supabase-anon-key", params.get("supabaseAnonKey"));
}