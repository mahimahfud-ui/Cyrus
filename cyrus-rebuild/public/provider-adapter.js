/* Authenticated same-origin adapter to Cyrus's Supabase-backed AI endpoint.
   Provider secrets and model fallback remain in Supabase Edge Function Secrets. */
(() => {
  "use strict";
  const cfg = window.CYRUS_CONFIG || {};
  function getAvailable() { return cfg.supabaseUrl && cfg.supabaseAnonKey ? "mahi-ai-chat" : null; }

  async function call(userMessage, history, systemInstructions, accessToken, signal) {
    if (!getAvailable()) throw new Error("Supabase is not configured for Cyrus.");
    if (!accessToken) throw new Error("Your session has expired. Reload Cyrus and try again.");
    const messages = (Array.isArray(history) ? history : [])
      .filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .slice(-36)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 30000) }));
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      messages.push({ role: "user", content: String(userMessage || "").slice(0, 30000) });
    }
    if (!messages[messages.length - 1].content.trim()) throw new Error("Type a message before sending.");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + accessToken },
      body: JSON.stringify({
        messages,
        custom_instructions: typeof systemInstructions === "string" ? systemInstructions.slice(0, 3000) : "",
        response_style: "default"
      }),
      signal
    });
    if (!response.ok) {
      let detail = "";
      try {
        const data = await response.json();
        detail = typeof data.error === "string" ? data.error : "";
      } catch (_) {
        try { detail = (await response.text()).slice(0, 500); } catch (_) {}
      }
      throw new Error(detail || "The AI request failed (" + response.status + ").");
    }

    const contentType = response.headers.get("content-type") || "";
    if (!response.body || !contentType.includes("text/event-stream")) {
      const raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch (_) { data = null; }
      if (data && typeof data.reply === "string") return data.reply;
      if (data && typeof data.error === "string") throw new Error(data.error);
      throw new Error("The AI service returned an unexpected response.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", answer = "", finished = false;
    function consumeBlock(block) {
      const dataLines = block.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim());
      if (!dataLines.length) return;
      const raw = dataLines.join("\n");
      if (!raw || raw === "[DONE]") { finished = true; return; }
      let event;
      try { event = JSON.parse(raw); } catch (_) { return; }
      if (event.type === "delta" && typeof event.text === "string") answer += event.text;
      else if (event.type === "reset") answer = "";
      else if (event.type === "error") throw new Error(typeof event.message === "string" ? event.message : "The AI service failed.");
      else if (event.type === "done") finished = true;
    }
    try {
      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          consumeBlock(block);
        }
      }
      buffer += decoder.decode();
      if (buffer.trim()) consumeBlock(buffer);
    } finally {
      try { reader.releaseLock(); } catch (_) {}
    }
    if (!answer.trim()) throw new Error("The AI service returned an empty response.");
    return answer.trim();
  }
  window.CyrusProvider = { getAvailable, call };
})();
