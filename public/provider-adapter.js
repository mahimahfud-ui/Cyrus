/* Cyrus AI adapter. All provider keys stay in Supabase Edge Function secrets. */
(() => {
  "use strict";
  const cfg = window.CYRUS_CONFIG || {};

  function getAvailable() {
    return typeof cfg.supabaseUrl === "string" && cfg.supabaseUrl.startsWith("https://") &&
      typeof cfg.supabaseAnonKey === "string" && cfg.supabaseAnonKey.length > 0
      ? "mahi-ai-chat" : null;
  }

  async function call(userMessage, history = [], systemInstructions = "", accessToken, signal, attachments = []) {
    if (!getAvailable()) throw new Error("Supabase is not configured for Cyrus.");
    if (!accessToken) throw new Error("Your session has expired. Reload Cyrus and try again.");

    const messages = (Array.isArray(history) ? history : [])
      .filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
      .slice(-36)
      .map((item) => ({ role: item.role, content: item.content.slice(0, 30000) }));
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      messages.push({ role: "user", content: String(userMessage || "").slice(0, 30000) });
    }
    if (!messages[messages.length - 1].content.trim()) throw new Error("Type a message before sending.");

    const attachmentRefs = (Array.isArray(attachments) ? attachments : []).slice(0, 20).map((item) => ({
      path: String(item.path || "").slice(0, 700),
      name: String(item.name || "attachment").slice(0, 160),
      mime_type: String(item.mime_type || "application/octet-stream").slice(0, 120),
      size: Math.max(0, Math.min(Number(item.size) || 0, 25 * 1024 * 1024))
    }));

    const endpoint = String(cfg.supabaseUrl).replace(/\/+$/, "") + "/functions/v1/mahi-ai-chat";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": cfg.supabaseAnonKey,
        "Authorization": "Bearer " + accessToken
      },
      body: JSON.stringify({
        conversation_id: null,
        temporary_chat: true,
        messages,
        custom_instructions: typeof systemInstructions === "string" ? systemInstructions.slice(0, 3000) : "",
        response_style: "default",
        attachments: attachmentRefs
      }),
      signal
    });

    const contentType = response.headers.get("content-type") || "";
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

    if (!response.body || !contentType.includes("text/event-stream")) {
      let data;
      try { data = await response.json(); } catch (_) { data = null; }
      if (data && typeof data.reply === "string") return data.reply;
      if (data && typeof data.error === "string") throw new Error(data.error);
      throw new Error("The AI service returned an unexpected response.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    let finished = false;

    function consumeBlock(block) {
      const dataLines = block.split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());
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
