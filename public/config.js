/* Cyrus public configuration. Provider credentials and service-role keys stay server-side. */
(() => {
  "use strict";
  const defaults = {
    supabaseUrl: "https://rpjqghibyzfldqlrxfna.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InJwanFnaGlieXpmbGRxbHJ4Zm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MTY1NDcsImV4cCI6MjEwODQ5MjU0N30.qdN2SUjwTRxjlIqQd81xDCrNRRaKqA61I4wIjGbusZs"
  };
  const query = new URLSearchParams(window.location.search);
  const readStorage = (key) => { try { return window.localStorage.getItem(key) || ""; } catch (_) { return ""; } };
  const writeStorage = (key, value) => { try { window.localStorage.setItem(key, value); } catch (_) {} };
  const queryUrl = query.get("supabaseUrl") || "";
  const queryKey = query.get("supabaseAnonKey") || "";
  if (queryUrl) writeStorage("cyrus-supabase-url", queryUrl);
  if (queryKey) writeStorage("cyrus-supabase-anon-key", queryKey);
  const previous = window.CYRUS_CONFIG || {};
  window.CYRUS_CONFIG = {
    ...previous,
    supabaseUrl: queryUrl || readStorage("cyrus-supabase-url") || previous.supabaseUrl || defaults.supabaseUrl,
    supabaseAnonKey: queryKey || readStorage("cyrus-supabase-anon-key") || previous.supabaseAnonKey || defaults.supabaseAnonKey,
    features: previous.features || { conversations: true }
  };
})();
