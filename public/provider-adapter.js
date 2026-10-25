/** ============================================================================
 * AI PROVIDER ADAPTER FOR CYRUS — FULLY UNLOCKED
 *
 * Routes all chat through the unlocked Supabase Edge Function `mahi-ai-chat`.
 * Body shape must match the Edge Function: { messages: [{role, content}, ...] }
 * ========================================================================= */

(() => {
  "use strict";

  function getConfig() {
    return window.CYRUS_CONFIG || {};
  }

  function getAvailableProvider() {
    const cfg = getConfig();
    if (cfg.supabaseUrl && cfg.supabaseAnonKey) return "supabase-edge";
    return null;
  }

  async function callAIProvider(userMessage, conversationHistory = [], systemInstructions = "") {
    const cfg = getConfig();
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      console.warn("Supabase not configured in CYRUS_CONFIG");
      return null;
    }

    let authHeader = "Bearer " + cfg.supabaseAnonKey;
    try {
      if (window.__cyrusSupabaseClient) {
        const { data } = await window.__cyrusSupabaseClient.auth.getSession();
        if (data && data.session && data.session.access_token) {
          authHeader = "Bearer " + data.session.access_token;
        }
      }
    } catch (_) {}

    // Edge Function contract: messages array, last item must be role=user
    const prior = (conversationHistory || [])
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: String(m.content) }));

    // Drop trailing user messages so the new one is last
    while (prior.length && prior[prior.length - 1].role === "user") {
      prior.pop();
    }

    const messages = prior.concat([{ role: "user", content: String(userMessage) }]);

    const body = {
      messages: messages,
      custom_instructions: systemInstructions || undefined,
      temporary_chat: false
    };

    const url = cfg.supabaseUrl.replace(/\/$/, "") + "/functions/v1/mahi-ai-chat";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: cfg.supabaseAnonKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error("Edge Function error " + response.status + ": " + errText.slice(0, 300));
    }

    const data = await response.json();
    return data.answer || data.response || data.text || data.message || data.content || null;
  }

  window.CyrusProvider = {
    call: callAIProvider,
    getAvailable: getAvailableProvider,
    config: { unlocked: true }
  };
})();
