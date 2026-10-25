/* Cyrus — FULLY UNLOCKED
   Public browser config only. Never put provider API keys or service-role keys here. */

window.CYRUS_CONFIG = {
  supabaseUrl: "https://rpjqghibyzfldqlrxfna.supabase.co",
  // Legacy anon JWT — most compatible with Edge Functions + supabase-js
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwanFnaGlieXpmbGRxbHJ4Zm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MTY1NDcsImV4cCI6MjEwODQ5MjU0N30.qdN2SUjwTRxjlIqQd81xDCrNRRaKqA61I4wIjGbusZs",
  features: {
    conversations: true,
    memory: true,
    imageGeneration: true,
    voiceInput: true
  },
  unlocked: true
};
