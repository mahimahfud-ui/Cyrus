/** ============================================================================
 * CYRUS - AI CHATBOT — FULLY UNLOCKED (messages[] body fix)
 * ========================================================================= */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const STORAGE_THEME = "cyrus-theme";
  const STORAGE_FONT_SIZE = "cyrus-font-size";
  const STORAGE_ENTER_TO_SEND = "cyrus-enter-to-send";
  const STORAGE_AUTO_SCROLL = "cyrus-auto-scroll";
  const STORAGE_SYSTEM_INSTRUCTIONS = "cyrus-system-instructions";

  const DEFAULT_PREFERENCES = {
    theme: "auto",
    fontSize: "normal",
    enterToSend: true,
    autoScroll: true,
    systemInstructions: ""
  };

  let preferences = { ...DEFAULT_PREFERENCES };

  const ui = {
    sidebar: $("sidebar"),
    sidebarScrim: $("sidebarScrim"),
    sidebarToggle: $("sidebarToggle"),
    newChatButton: $("newChatButton"),
    conversationSearch: $("conversationSearch"),
    conversationsList: $("conversationsList"),
    settingsButton: $("settingsButton"),
    accountButton: $("accountButton"),
    mainContent: $("mainContent"),
    welcomeContainer: $("welcomeContainer"),
    chatMessagesContainer: $("chatMessagesContainer"),
    messagesScrollContainer: $("messagesScrollContainer"),
    messagesList: $("messagesList"),
    messageForm: $("messageForm"),
    messageInput: $("messageInput"),
    sendButton: $("sendButton"),
    stopButton: $("stopButton"),
    attachButton: $("attachButton"),
    fileInput: $("fileInput"),
    attachmentList: $("attachmentList"),
    errorBanner: $("errorBanner"),
    errorMessage: $("errorMessage"),
    errorClose: $("errorClose"),
    charCount: $("charCount"),
    settingsModal: $("settingsModal"),
    themeToggleButton: $("themeToggleButton"),
    headerAccountButton: $("headerAccountButton"),
    themeSelect: $("themeSelect"),
    fontSizeSelect: $("fontSizeSelect"),
    enterToSendToggle: $("enterToSendToggle"),
    autoScrollToggle: $("autoScrollToggle"),
    systemInstructions: $("systemInstructions"),
    clearHistoryButton: $("clearHistoryButton"),
    signOutButton: $("signOutButton"),
    accountContent: $("accountContent")
  };

  let state = {
    currentConversationId: null,
    messages: [],
    isSending: false,
    conversations: [],
    supabaseClient: null,
    currentUser: null,
    abortController: null
  };

  function getCfg() {
    return window.CYRUS_CONFIG || {};
  }

  async function init() {
    console.log("🤖 Cyrus initializing (FULLY UNLOCKED)...");
    loadPreferences();
    applyTheme();
    initEventListeners();
    try {
      await initSupabase();
      await authenticateUser();
      await loadConversations();
    } catch (error) {
      console.warn("Supabase init warning:", error);
    }
    showWelcomeState();
    console.log("✅ Cyrus ready (unlocked)");
  }

  async function initSupabase() {
    const cfg = getCfg();
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      console.warn("Supabase credentials not configured.");
      return;
    }
    if (window.supabase && window.supabase.createClient) {
      state.supabaseClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      window.__cyrusSupabaseClient = state.supabaseClient;
      console.log("✅ Supabase initialized");
      return;
    }
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = () => {
        try {
          state.supabaseClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
          window.__cyrusSupabaseClient = state.supabaseClient;
          console.log("✅ Supabase initialized");
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function authenticateUser() {
    if (!state.supabaseClient) return;
    try {
      const { data, error } = await state.supabaseClient.auth.getSession();
      if (error) throw error;
      if (data.session) {
        state.currentUser = data.session.user;
        return;
      }
      const { data: anonData, error: anonError } = await state.supabaseClient.auth.signInAnonymously();
      if (anonError) {
        console.warn("Anonymous sign-in failed:", anonError.message);
        return;
      }
      state.currentUser = anonData.session.user;
    } catch (error) {
      console.warn("Auth warning:", error.message || error);
    }
  }

  async function loadConversations() {
    if (!state.supabaseClient || !state.currentUser) return;
    try {
      const { data, error } = await state.supabaseClient
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .eq("user_id", state.currentUser.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      state.conversations = data || [];
      renderConversationsList();
    } catch (error) {
      console.warn("loadConversations:", error.message || error);
    }
  }

  function renderConversationsList() {
    if (!ui.conversationsList) return;
    ui.conversationsList.innerHTML = "";
    if (!state.conversations.length) {
      ui.conversationsList.innerHTML = '<div class="empty-state">No conversations yet</div>';
      return;
    }
    state.conversations.forEach((conv) => {
      const item = document.createElement("button");
      item.className = "conversation-item" + (conv.id === state.currentConversationId ? " active" : "");
      item.innerHTML =
        '<div class="conversation-item-title">' +
        escapeHtml(conv.title || "Untitled") +
        '</div><div class="conversation-item-date">' +
        formatDate(conv.updated_at) +
        "</div>";
      item.addEventListener("click", () => selectConversation(conv.id));
      ui.conversationsList.appendChild(item);
    });
  }

  async function selectConversation(conversationId) {
    state.currentConversationId = conversationId;
    state.messages = [];
    if (ui.messagesList) ui.messagesList.innerHTML = "";
    if (!state.supabaseClient) return;
    try {
      const { data, error } = await state.supabaseClient
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      state.messages = data || [];
      renderMessages();
      showChatState();
      renderConversationsList();
      scrollToBottom();
    } catch (error) {
      console.warn("selectConversation:", error.message || error);
    }
  }

  async function startNewConversation() {
    if (!state.supabaseClient || !state.currentUser) {
      state.currentConversationId = "local-" + Date.now();
      state.messages = [];
      if (ui.messagesList) ui.messagesList.innerHTML = "";
      return;
    }
    try {
      const { data, error } = await state.supabaseClient
        .from("conversations")
        .insert([{ user_id: state.currentUser.id, title: "New Conversation" }])
        .select("id")
        .single();
      if (error) throw error;
      state.currentConversationId = data.id;
      state.messages = [];
      if (ui.messagesList) ui.messagesList.innerHTML = "";
      await loadConversations();
    } catch (error) {
      console.warn("startNewConversation fallback to local:", error.message || error);
      state.currentConversationId = "local-" + Date.now();
      state.messages = [];
    }
  }

  async function sendMessage(text) {
    if (!text || !text.trim()) return;
    if (state.isSending) return;

    state.isSending = true;
    if (ui.sendButton) ui.sendButton.hidden = true;
    if (ui.stopButton) ui.stopButton.hidden = false;
    state.abortController = new AbortController();
    hideError();

    try {
      if (!state.currentConversationId) {
        await startNewConversation();
      }

      const userMsg = { role: "user", content: text.trim() };
      if (state.supabaseClient && state.currentUser && state.currentConversationId && !String(state.currentConversationId).startsWith("local-")) {
        try {
          const { data, error } = await state.supabaseClient
            .from("messages")
            .insert([{
              conversation_id: state.currentConversationId,
              user_id: state.currentUser.id,
              role: "user",
              content: text.trim()
            }])
            .select("*")
            .single();
          if (!error && data) state.messages.push(data);
          else state.messages.push(userMsg);
        } catch (_) {
          state.messages.push(userMsg);
        }
      } else {
        state.messages.push(userMsg);
      }

      renderMessages();
      showChatState();
      if (ui.messageInput) {
        ui.messageInput.value = "";
        ui.messageInput.style.height = "auto";
      }
      addLoadingMessage();
      scrollToBottom();

      // Pass history WITHOUT the just-added user message (adapter will append it)
      const historyForApi = state.messages
        .slice(0, -1)
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await callAIProvider(text.trim(), historyForApi);

      if (response) {
        const assistantMsg = { role: "assistant", content: response };
        if (state.supabaseClient && state.currentUser && state.currentConversationId && !String(state.currentConversationId).startsWith("local-")) {
          try {
            const { data, error } = await state.supabaseClient
              .from("messages")
              .insert([{
                conversation_id: state.currentConversationId,
                user_id: state.currentUser.id,
                role: "assistant",
                content: response
              }])
              .select("*")
              .single();
            if (!error && data) state.messages.push(data);
            else state.messages.push(assistantMsg);
          } catch (_) {
            state.messages.push(assistantMsg);
          }
        } else {
          state.messages.push(assistantMsg);
        }
      } else {
        showError("No response from AI. Check Edge Function deploy + provider keys.");
      }

      renderMessages();
      scrollToBottom();
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Message send error:", error);
        showError(error.message || "Failed to send message. Please try again.");
      }
    } finally {
      state.isSending = false;
      if (ui.sendButton) ui.sendButton.hidden = false;
      if (ui.stopButton) ui.stopButton.hidden = true;
      removeLoadingMessage();
      if (ui.messageInput) ui.messageInput.focus();
    }
  }

  function addLoadingMessage() {
    if (!ui.messagesList) return;
    ui.messagesList.insertAdjacentHTML(
      "beforeend",
      '<div class="message assistant"><div class="message-avatar">C</div><div class="message-content"><div class="message-text message-loading"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div></div></div>'
    );
  }

  function removeLoadingMessage() {
    if (!ui.messagesList) return;
    const loading = ui.messagesList.querySelector(".message-loading");
    if (loading) loading.closest(".message").remove();
  }

  function renderMessages() {
    if (!ui.messagesList) return;
    ui.messagesList.innerHTML = "";
    state.messages.forEach((msg) => {
      const el = document.createElement("div");
      el.className = "message " + msg.role;
      el.innerHTML =
        '<div class="message-avatar">' +
        (msg.role === "user" ? "You" : "C") +
        '</div><div class="message-content"><div class="message-text">' +
        formatMessageContent(msg.content) +
        "</div></div>";
      ui.messagesList.appendChild(el);
    });
  }

  function formatMessageContent(content) {
    let html = escapeHtml(content || "");
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/`(.*?)`/g, "<code>$1</code>");
    html = html.replace(/\n/g, "<br>");
    return html;
  }

  async function callAIProvider(userMessage, historyForApi) {
    if (window.CyrusProvider && typeof window.CyrusProvider.call === "function") {
      return await window.CyrusProvider.call(
        userMessage,
        historyForApi || [],
        preferences.systemInstructions || ""
      );
    }

    // Fallback — same messages[] contract as Edge Function
    const cfg = getCfg();
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      throw new Error("Supabase config missing");
    }

    let authHeader = "Bearer " + cfg.supabaseAnonKey;
    try {
      if (state.supabaseClient) {
        const { data } = await state.supabaseClient.auth.getSession();
        if (data && data.session && data.session.access_token) {
          authHeader = "Bearer " + data.session.access_token;
        }
      }
    } catch (_) {}

    const prior = (historyForApi || [])
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: String(m.content) }));
    while (prior.length && prior[prior.length - 1].role === "user") prior.pop();
    const messages = prior.concat([{ role: "user", content: String(userMessage) }]);

    const url = cfg.supabaseUrl.replace(/\/$/, "") + "/functions/v1/mahi-ai-chat";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: cfg.supabaseAnonKey
      },
      body: JSON.stringify({
        messages: messages,
        custom_instructions: preferences.systemInstructions || undefined,
        temporary_chat: false
      }),
      signal: state.abortController ? state.abortController.signal : undefined
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error("Edge Function " + response.status + ": " + errText.slice(0, 250));
    }

    const data = await response.json();
    return data.answer || data.response || data.text || data.message || data.content || null;
  }

  function showWelcomeState() {
    if (ui.welcomeContainer) ui.welcomeContainer.hidden = false;
    if (ui.chatMessagesContainer) ui.chatMessagesContainer.hidden = true;
  }

  function showChatState() {
    if (ui.welcomeContainer) ui.welcomeContainer.hidden = true;
    if (ui.chatMessagesContainer) ui.chatMessagesContainer.hidden = false;
  }

  function scrollToBottom() {
    if (preferences.autoScroll && ui.messagesScrollContainer) {
      ui.messagesScrollContainer.scrollTop = ui.messagesScrollContainer.scrollHeight;
    }
  }

  function showError(message) {
    if (ui.errorMessage) ui.errorMessage.textContent = message;
    if (ui.errorBanner) ui.errorBanner.hidden = false;
  }

  function hideError() {
    if (ui.errorBanner) ui.errorBanner.hidden = true;
    if (ui.errorMessage) ui.errorMessage.textContent = "";
  }

  function loadPreferences() {
    const theme = localStorage.getItem(STORAGE_THEME) || DEFAULT_PREFERENCES.theme;
    const fontSize = localStorage.getItem(STORAGE_FONT_SIZE) || DEFAULT_PREFERENCES.fontSize;
    const enterToSend = localStorage.getItem(STORAGE_ENTER_TO_SEND);
    const autoScroll = localStorage.getItem(STORAGE_AUTO_SCROLL);
    const systemInstructions = localStorage.getItem(STORAGE_SYSTEM_INSTRUCTIONS) || "";
    preferences = {
      theme,
      fontSize,
      enterToSend: enterToSend === null ? true : enterToSend === "true",
      autoScroll: autoScroll === null ? true : autoScroll === "true",
      systemInstructions
    };
    if (ui.themeSelect) ui.themeSelect.value = theme;
    if (ui.fontSizeSelect) ui.fontSizeSelect.value = fontSize;
    if (ui.enterToSendToggle) ui.enterToSendToggle.checked = preferences.enterToSend;
    if (ui.autoScrollToggle) ui.autoScrollToggle.checked = preferences.autoScroll;
    if (ui.systemInstructions) ui.systemInstructions.value = systemInstructions;
  }

  function applyTheme() {
    const theme = preferences.theme;
    if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
    else if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  }

  function initEventListeners() {
    if (ui.messageForm) {
      ui.messageForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = ui.messageInput ? ui.messageInput.value : "";
        sendMessage(text);
      });
    }
    if (ui.messageInput) {
      ui.messageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && preferences.enterToSend) {
          e.preventDefault();
          sendMessage(ui.messageInput.value);
        }
      });
    }
    if (ui.newChatButton) {
      ui.newChatButton.addEventListener("click", () => startNewConversation());
    }
    if (ui.stopButton) {
      ui.stopButton.addEventListener("click", () => {
        if (state.abortController) state.abortController.abort();
      });
    }
    if (ui.errorClose) ui.errorClose.addEventListener("click", hideError);

    document.querySelectorAll(".prompt-suggestion").forEach((btn) => {
      btn.addEventListener("click", () => {
        const prompt = btn.getAttribute("data-prompt");
        if (prompt) sendMessage(prompt);
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch (_) {
      return "";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
