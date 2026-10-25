/** ============================================================================
 * AI PROVIDER ADAPTER FOR CYRUS — FULLY UNLOCKED
 *
 * Routes all chat through the unlocked Supabase Edge Function `mahi-ai-chat`.
 * Provider keys stay server-side only. No client-side provider locks.
 * ========================================================================= */

(() => {
  "use strict";

  function getConfig() {
    return window.CYRUS_CONFIG || {};
  }

  function getAvailableProvider() {
    const cfg = getConfig();
    // Unlocked: if Supabase is configured we treat the Edge Function as available.
    if (cfg.supabaseUrl && cfg.supabaseAnonKey) return "supabase-edge";
    return null;
  }

  /**
   * Call the fully unlocked mahi-ai-chat Edge Function.
   */
  async function callAIProvider(userMessage, conversationHistory = [], systemInstructions = "") {
    const cfg = getConfig();
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      console.warn("Supabase not configured in CYRUS_CONFIG");
      return null;
    }

    // Prefer the authenticated session token when available
    let authHeader = `Bearer ${cfg.supabaseAnonKey}`;
    try {
      if (window.supabase && window.__cyrusSupabaseClient) {
        const { data } = await window.__cyrusSupabaseClient.auth.getSession();
        if (data?.session?.access_token) {
          authHeader = `Bearer ${data.session.access_token}`;
        }
      }
    } catch (_) {}

    const body = {
      message: userMessage,
      history: conversationHistory.map((m) => ({
        role: m.role,
        content: m.content
      })),
      system_instructions: systemInstructions || undefined,
      // FULL UNLOCK flags that the Edge Function already respects
      stream: false
    };

    const url = `${cfg.supabaseUrl.replace(/\/$/, "")}/functions/v1/mahi-ai-chat`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "apikey": cfg.supabaseAnonKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Edge Function error ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    // Support common response shapes used by the Edge Function
    return data.answer || data.response || data.text || data.message || data.content || null;
  }

  window.CyrusProvider = {
    call: callAIProvider,
    getAvailable: getAvailableProvider,
    config: { unlocked: true }
  };
})();
