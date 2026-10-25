/** ============================================================================
 * CYRUS - AI CHATBOT
 * Premium AI conversational interface — FULLY UNLOCKED
 * ========================================================================= */

(() => {
  "use strict";

  const cfg = window.CYRUS_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => document.querySelectorAll(selector);

  const STORAGE_THEME = "cyrus-theme";
  const STORAGE_FONT_SIZE = "cyrus-font-size";
  const STORAGE_ENTER_TO_SEND = "cyrus-enter-to-send";
  const STORAGE_AUTO_SCROLL = "cyrus-auto-scroll";
  const STORAGE_SYSTEM_INSTRUCTIONS = "cyrus-system-instructions";
  const STORAGE_DISPLAY_NAME = "cyrus-display-name";

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
    isLoading: false,
    isSending: false,
    pendingFiles: [],
    previewUrls: [],
    conversations: [],
    supabaseClient: null,
    currentUser: null,
    abortController: null
  };

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
      console.warn("Supabase initialization failed:", error);
      showError("Could not connect to Supabase. Check your configuration.");
    }
    showWelcomeState();
    console.log("✅ Cyrus ready (unlocked)");
  }

  async function initSupabase() {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      console.warn("Supabase credentials not configured. Some features will be unavailable.");
      return;
    }
    const supabaseScript = document.createElement("script");
    supabaseScript.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    return new Promise((resolve, reject) => {
      supabaseScript.onload = async () => {
        try {
          const { createClient } = window.supabase;
          state.supabaseClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
          window.__cyrusSupabaseClient = state.supabaseClient;
          console.log("✅ Supabase initialized (unlocked)");
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      supabaseScript.onerror = reject;
      document.head.appendChild(supabaseScript);
    });
  }

  async function authenticateUser() {
    if (!state.supabaseClient) return;
    try {
      const { data, error } = await state.supabaseClient.auth.getSession();
      if (error) throw error;
      if (data.session) {
        state.currentUser = data.session.user;
        updateAccountDisplay();
      } else {
        const { data: anonData, error: anonError } = await state.supabaseClient.auth.signInAnonymously();
        if (anonError) throw anonError;
        state.currentUser = anonData.session.user;
      }
    } catch (error) {
      console.error("Authentication error:", error);
      showError("Authentication failed. Some features may be unavailable.");
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
      console.error("Failed to load conversations:", error);
    }
  }

  function renderConversationsList() {
    if (!ui.conversationsList) return;
    ui.conversationsList.innerHTML = "";
    if (state.conversations.length === 0) {
      ui.conversationsList.innerHTML = '<div class="empty-state">No conversations yet</div>';
      return;
    }
    const grouped = groupConversationsByDate(state.conversations);
    for (const [dateGroup, conversations] of Object.entries(grouped)) {
      conversations.forEach(conv => {
        const item = document.createElement("button");
        item.className = "conversation-item" + (conv.id === state.currentConversationId ? " active" : "");
        item.innerHTML = `
          <div class="conversation-item-title">${escapeHtml(conv.title || "Untitled")}</div>
          <div class="conversation-item-date">${formatDate(conv.updated_at)}</div>
        `;
        item.addEventListener("click", () => selectConversation(conv.id));
        ui.conversationsList.appendChild(item);
      });
    }
  }

  function groupConversationsByDate(conversations) {
    const groups = {};
    conversations.forEach(conv => {
      const date = new Date(conv.updated_at);
      const dateKey = date.toLocaleDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(conv);
    });
    return groups;
  }

  async function selectConversation(conversationId) {
    state.currentConversationId = conversationId;
    state.messages = [];
    if (ui.messagesList) ui.messagesList.innerHTML = "";
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
      console.error("Failed to load messages:", error);
      showError("Could not load conversation");
    }
  }

  async function startNewConversation() {
    if (!state.supabaseClient || !state.currentUser) {
      showError("Not authenticated");
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
      showWelcomeState();
    } catch (error) {
      console.error("Failed to create conversation:", error);
      showError("Could not create new conversation");
    }
  }

  async function sendMessage(text) {
    if (!text.trim()) return;
    if (state.isSending) return;

    // FULL UNLOCK: always attempt the Edge Function when Supabase is present.
    // Provider availability is decided server-side.

    state.isSending = true;
    if (ui.sendButton) ui.sendButton.hidden = true;
    if (ui.stopButton) ui.stopButton.hidden = false;
    state.abortController = new AbortController();

    try {
      if (!state.currentConversationId) {
        await startNewConversation();
      }

      if (state.supabaseClient && state.currentUser) {
        const { data: userMsgData, error: userMsgError } = await state.supabaseClient
          .from("messages")
          .insert([{
            conversation_id: state.currentConversationId,
            user_id: state.currentUser.id,
            role: "user",
            content: text
          }])
          .select("*")
          .single();
        if (userMsgError) throw userMsgError;
        state.messages.push(userMsgData);
      } else {
        state.messages.push({ role: "user", content: text });
      }

      renderMessages();
      showChatState();
      if (ui.messageInput) {
        ui.messageInput.value = "";
        ui.messageInput.style.height = "auto";
      }
      addLoadingMessage();
      scrollToBottom();

      const response = await callAIProvider(text);

      if (response) {
        if (state.supabaseClient && state.currentUser) {
          const { data: assistantMsgData, error: assistantMsgError } = await state.supabaseClient
            .from("messages")
            .insert([{
              conversation_id: state.currentConversationId,
              user_id: state.currentUser.id,
              role: "assistant",
              content: response
            }])
            .select("*")
            .single();
          if (assistantMsgError) throw assistantMsgError;
          state.messages.push(assistantMsgData);
        } else {
          state.messages.push({ role: "assistant", content: response });
        }
      }

      renderMessages();
      scrollToBottom();
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Message send error:", error);
        showError("Failed to send message. Please try again.");
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
    const loadingHTML = `
      <div class="message assistant">
        <div class="message-avatar">C</div>
        <div class="message-content">
          <div class="message-text message-loading">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
          </div>
        </div>
      </div>
    `;
    ui.messagesList.insertAdjacentHTML("beforeend", loadingHTML);
  }

  function removeLoadingMessage() {
    if (!ui.messagesList) return;
    const loading = ui.messagesList.querySelector(".message-loading");
    if (loading) loading.closest(".message").remove();
  }

  function renderMessages() {
    if (!ui.messagesList) return;
    ui.messagesList.innerHTML = "";
    state.messages.forEach(msg => {
      const messageEl = document.createElement("div");
      messageEl.className = `message ${msg.role}`;
      const avatar = `<div class="message-avatar">${msg.role === "user" ? "You" : "C"}</div>`;
      const content = `<div class="message-content"><div class="message-text">${formatMessageContent(msg.content)}</div></div>`;
      messageEl.innerHTML = avatar + content;
      ui.messagesList.appendChild(messageEl);
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

  // =========================================================================
  // AI PROVIDER INTEGRATION — FULLY UNLOCKED
  // =========================================================================
  function isAIProviderConfigured() {
    const cfg = window.CYRUS_CONFIG || {};
    if (cfg.supabaseUrl && cfg.supabaseAnonKey) return true;
    if (window.CyrusProvider && window.CyrusProvider.getAvailable()) return true;
    return false;
  }

  async function callAIProvider(userMessage) {
    if (window.CyrusProvider && typeof window.CyrusProvider.call === "function") {
      const history = state.messages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ role: m.role, content: m.content }));
      const systemInstructions = preferences.systemInstructions || "";
      return await window.CyrusProvider.call(userMessage, history, systemInstructions);
    }

    const localCfg = window.CYRUS_CONFIG || {};
    if (!localCfg.supabaseUrl || !localCfg.supabaseAnonKey) {
      showError("Supabase config missing. Set supabaseUrl + supabaseAnonKey in public/config.js");
      return null;
    }

    let authHeader = "Bearer " + localCfg.supabaseAnonKey;
    try {
      if (state.supabaseClient) {
        const { data } = await state.supabaseClient.auth.getSession();
        if (data?.session?.access_token) {
          authHeader = "Bearer " + data.session.access_token;
        }
      }
    } catch (_) {}

    const url = localCfg.supabaseUrl.replace(/\/$/, "") + "/functions/v1/mahi-ai-chat";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "apikey": localCfg.supabaseAnonKey
      },
      body: JSON.stringify({
        message: userMessage,
        history: state.messages.map(m => ({ role: m.role, content: m.content })),
        system_instructions: preferences.systemInstructions || undefined
      }),
      signal: state.abortController ? state.abortController.signal : undefined
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error("Edge Function " + response.status + ": " + errText.slice(0, 200));
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

  function savePreferences() {
    localStorage.setItem(STORAGE_THEME, preferences.theme);
    localStorage.setItem(STORAGE_FONT_SIZE, preferences.fontSize);
    localStorage.setItem(STORAGE_ENTER_TO_SEND, preferences.enterToSend.toString());
    localStorage.setItem(STORAGE_AUTO_SCROLL, preferences.autoScroll.toString());
    localStorage.setItem(STORAGE_SYSTEM_INSTRUCTIONS, preferences.systemInstructions);
  }

  function applyTheme() {
    const theme = preferences.theme;
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
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
    if (ui.newChatButton) ui.newChatButton.addEventListener("click", () => startNewConversation());
    if (ui.stopButton) ui.stopButton.addEventListener("click", () => {
      if (state.abortController) state.abortController.abort();
    });
    if (ui.errorClose) ui.errorClose.addEventListener("click", hideError);
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

  function updateAccountDisplay() {}

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
