/**
 * AI PROVIDER ADAPTER FOR CYRUS
 * All provider calls go through Supabase Edge Function mahi-ai-chat.
 * Supports both JSON responses and the Edge Function's Server-Sent Events stream.
 */
(() => {
  "use strict";

  function getConfig() {
    return window.CYRUS_CONFIG || {};
  }

  function getAvailableProvider() {
    const cfg = getConfig();
    return cfg.supabaseUrl && cfg.supabaseAnonKey ? "supabase-edge" : null;
  }

  function textFromJson(data) {
    if (!data || typeof data !== "object") return null;
    for (const key of ["reply", "answer", "response", "text", "message", "content"]) {
      if (typeof data[key] === "string" && data[key].trim()) return data[key].trim();
    }
    return null;
  }

  function consumeSseBlock(block, state) {
    const dataLines = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());
    if (!dataLines.length) return;

    const raw = dataLines.join("\n").trim();
    if (!raw || raw === "[DONE]") {
      state.finished = true;
      return;
    }

    let event;
    try {
      event = JSON.parse(raw);
    } catch (_) {
      throw new Error("The AI service sent malformed streaming data. Please retry.");
    }

    if (!event || typeof event !== "object") return;
    if (event.type === "delta" && typeof event.text === "string") {
      state.answer += event.text;
    } else if (event.type === "reset") {
      state.answer = "";
    } else if (event.type === "error") {
      throw new Error(typeof event.message === "string" && event.message.trim()
        ? event.message
        : "The AI service could not complete this request.");
    } else if (event.type === "done") {
      state.finished = true;
    } else if (event.type === "result" || event.type === "response") {
      const text = textFromJson(event);
      if (text) state.answer += text;
    }
  }

  async function readSseResponse(response) {
    if (!response.body || typeof response.body.getReader !== "function") {
      const text = await response.text();
      return parseSseText(text);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const state = { answer: "", finished: false };
    let buffer = "";

    try {
      while (!state.finished) {
        const part = await reader.read();
        if (part.done) break;

        buffer += decoder.decode(part.value, { stream: true }).replace(/\r\n/g, "\n");
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          consumeSseBlock(block, state);
          if (state.finished) break;
        }
      }

      buffer += decoder.decode();
      if (!state.finished && buffer.trim()) consumeSseBlock(buffer, state);
    } finally {
      try { reader.releaseLock(); } catch (_) {}
    }

    if (!state.answer.trim()) {
      throw new Error("The AI service returned an empty response.");
    }
    return state.answer.trim();
  }

  function parseSseText(text) {
    const state = { answer: "", finished: false };
    const blocks = String(text || "").replace(/\r\n/g, "\n").split("\n\n");
    for (const block of blocks) {
      if (!block.trim() || state.finished) continue;
      consumeSseBlock(block, state);
    }
    if (!state.answer.trim()) {
      throw new Error("The AI service returned an empty response.");
    }
    return state.answer.trim();
  }

  async function parseResponse(response) {
    const contentType = (response.headers && response.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("text/event-stream")) {
      return readSseResponse(response);
    }

    const raw = await response.text();
    if (/^\s*(?:event:[^\n]*\n\s*)?data:/m.test(raw)) {
      return parseSseText(raw);
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      throw new Error("The AI service returned an unexpected response. Please retry.");
    }

    const answer = textFromJson(data);
    if (answer) return answer;
    if (data && typeof data.error === "string" && data.error.trim()) throw new Error(data.error);
    throw new Error("The AI service returned an empty response.");
  }

  async function callAIProvider(userMessage, conversationHistory = [], systemInstructions = "") {
    const cfg = getConfig();
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      throw new Error("Supabase is not configured for Cyrus.");
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

    const prior = (Array.isArray(conversationHistory) ? conversationHistory : [])
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: String(m.content) }));

    while (prior.length && prior[prior.length - 1].role === "user") prior.pop();
    const messages = prior.concat([{ role: "user", content: String(userMessage || "") }]);

    const response = await fetch(
      cfg.supabaseUrl.replace(/\/+$/, "") + "/functions/v1/mahi-ai-chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          apikey: cfg.supabaseAnonKey
        },
        body: JSON.stringify({
          messages,
          custom_instructions: typeof systemInstructions === "string" ? systemInstructions : "",
          temporary_chat: false
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error("Edge Function error " + response.status + ": " + errText.slice(0, 300));
    }

    return await parseResponse(response);
  }

  window.CyrusProvider = {
    call: callAIProvider,
    getAvailable: getAvailableProvider,
    parseResponse,
    config: { unlocked: true }
  };
})();
