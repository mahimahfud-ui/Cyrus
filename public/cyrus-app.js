/** ============================================================================
 * CYRUS — conversational interface
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
    abortController: null,
    searchQuery: ""
  };

  function getCfg() {
    return window.CYRUS_CONFIG || {};
  }

  async function init() {
    console.log("🤖 Cyrus initializing...");
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
    console.log("✅ Cyrus ready");
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
        .from("mahi_ai_conversations")
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
    const query = state.searchQuery.trim().toLowerCase();
    const visibleConversations = state.conversations.filter((conv) =>
      String(conv.title || "Untitled").toLowerCase().includes(query)
    );
    if (!visibleConversations.length) {
      ui.conversationsList.innerHTML = '<div class="empty-state">' +
        (query ? "No matching conversations" : "No conversations yet") + '</div>';
      return;
    }
    visibleConversations.forEach((conv) => {
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
        .from("mahi_ai_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      state.messages = data || [];
      renderMessages();
      showChatState();
      renderConversationsList();
      scrollToBottom();
      setSidebarOpen(false);
    } catch (error) {
      console.warn("selectConversation:", error.message || error);
      showError("Could not open this conversation. Please try again.");
    }
  }

  async function startNewConversation() {
    if (!state.supabaseClient || !state.currentUser) {
      state.currentConversationId = "local-" + Date.now();
      state.messages = [];
      if (ui.messagesList) ui.messagesList.innerHTML = "";
      showWelcomeState();
      renderConversationsList();
      setSidebarOpen(false);
      return;
    }
    try {
      const { data, error } = await state.supabaseClient
        .from("mahi_ai_conversations")
        .insert([{ user_id: state.currentUser.id, title: "New Conversation" }])
        .select("id")
        .single();
      if (error) throw error;
      state.currentConversationId = data.id;
      state.messages = [];
      if (ui.messagesList) ui.messagesList.innerHTML = "";
      await loadConversations();
      showWelcomeState();
      setSidebarOpen(false);
    } catch (error) {
      console.warn("startNewConversation fallback to local:", error.message || error);
      state.currentConversationId = "local-" + Date.now();
      state.messages = [];
      showWelcomeState();
      setSidebarOpen(false);
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
            .from("mahi_ai_messages")
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
              .from("mahi_ai_messages")
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
      const role = msg.role === "user" ? "user" : "assistant";
      el.className = "message " + role;
      el.innerHTML =
        '<div class="message-avatar">' +
        (role === "user" ? "You" : "C") +
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
    if (!window.CyrusProvider || typeof window.CyrusProvider.call !== "function") {
      throw new Error("AI setup is pending. Cyrus is not connected to an AI provider yet.");
    }
    return await window.CyrusProvider.call(
      userMessage,
      historyForApi || [],
      preferences.systemInstructions || "",
      state.abortController ? state.abortController.signal : undefined
    );
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
    document.documentElement.setAttribute("data-font-size", preferences.fontSize || "normal");
    if (ui.themeToggleButton) ui.themeToggleButton.setAttribute("aria-pressed", String(theme === "light"));
  }

  function setSidebarOpen(open) {
    const isOpen = Boolean(open);
    document.body.classList.toggle("sidebar-open", isOpen);
    if (ui.sidebarScrim) {
      ui.sidebarScrim.hidden = !isOpen;
      ui.sidebarScrim.setAttribute("aria-hidden", String(!isOpen));
    }
    if (ui.sidebar) ui.sidebar.dataset.state = isOpen ? "open" : "closed";
    if (ui.sidebarToggle) ui.sidebarToggle.setAttribute("aria-expanded", String(isOpen));
  }

  function setSettingsTab(name) {
    const tabs = Array.from(document.querySelectorAll("[data-settings-tab]"));
    const panels = Array.from(document.querySelectorAll("[data-settings-panel]"));
    const selected = tabs.some((tab) => tab.dataset.settingsTab === name) ? name : "appearance";
    tabs.forEach((tab) => {
      const active = tab.dataset.settingsTab === selected;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => { panel.hidden = panel.dataset.settingsPanel !== selected; });
  }

  let modalReturnFocus = null;

  function openSettings(tab) {
    if (!ui.settingsModal) return;
    modalReturnFocus = document.activeElement;
    setSettingsTab(tab || "appearance");
    renderAccountDetails();
    if (!ui.settingsModal.open) {
      if (typeof ui.settingsModal.showModal === "function") ui.settingsModal.showModal();
      else ui.settingsModal.setAttribute("open", "");
    }
  }

  function closeSettings() {
    if (!ui.settingsModal) return;
    if (ui.settingsModal.open && typeof ui.settingsModal.close === "function") ui.settingsModal.close();
    else ui.settingsModal.removeAttribute("open");
  }

  function renderAccountDetails() {
    if (!ui.accountContent) return;
    const user = state.currentUser;
    if (!user) {
      ui.accountContent.innerHTML = '<div class="account-detail"><span class="account-label">Status</span><strong>Signed out</strong></div>';
      if (ui.signOutButton) { ui.signOutButton.disabled = true; ui.signOutButton.textContent = "Signed Out"; }
      return;
    }
    const email = user.email || (user.is_anonymous ? "Guest session" : "Email unavailable");
    ui.accountContent.innerHTML =
      '<div class="account-detail"><span class="account-label">Account</span><strong>' + escapeHtml(email) + '</strong></div>' +
      '<div class="account-detail"><span class="account-label">User ID</span><strong class="account-id">' + escapeHtml(user.id || "") + '</strong></div>' +
      '<div class="account-detail"><span class="account-label">Authentication</span><strong>' +
      (user.is_anonymous ? "Anonymous session" : "Authenticated") + '</strong></div>';
    if (ui.signOutButton) { ui.signOutButton.disabled = false; ui.signOutButton.textContent = "Sign Out"; }
  }

  async function clearConversationHistory() {
    if (!state.supabaseClient || !state.currentUser) {
      showError("Conversation history is unavailable while signed out.");
      return;
    }
    if (!window.confirm("Delete all of your Cyrus conversations? This cannot be undone.")) return;
    try {
      const userId = state.currentUser.id;
      // Deleting the owned conversation rows cascades to its messages via the existing FK.
      const conversationsResult = await state.supabaseClient.from("mahi_ai_conversations").delete().eq("user_id", userId);
      if (conversationsResult.error) throw conversationsResult.error;
      state.currentConversationId = null;
      state.messages = [];
      state.conversations = [];
      if (ui.messagesList) ui.messagesList.innerHTML = "";
      renderConversationsList();
      showWelcomeState();
      hideError();
      closeSettings();
    } catch (error) {
      console.error("Clear history error:", error);
      showError("Could not clear conversation history. Check your account permissions and try again.");
    }
  }

  async function signOut() {
    if (!state.supabaseClient || !state.currentUser) return;
    try {
      const { error } = await state.supabaseClient.auth.signOut();
      if (error) throw error;
      state.currentUser = null;
      state.currentConversationId = null;
      state.messages = [];
      state.conversations = [];
      if (ui.messagesList) ui.messagesList.innerHTML = "";
      renderConversationsList();
      renderAccountDetails();
      showWelcomeState();
      showError("You have signed out. Refresh the page to start a new guest session.");
    } catch (error) {
      console.error("Sign out error:", error);
      showError("Could not sign out. Please try again.");
    }
  }

  function persistPreference(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) {}
  }

  function initEventListeners() {
    if (ui.messageForm) ui.messageForm.addEventListener("submit", (event) => {
      event.preventDefault();
      sendMessage(ui.messageInput ? ui.messageInput.value : "");
    });
    if (ui.messageInput) ui.messageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && preferences.enterToSend) {
        event.preventDefault();
        sendMessage(ui.messageInput.value);
      }
    });
    if (ui.newChatButton) ui.newChatButton.addEventListener("click", () => startNewConversation());
    if (ui.stopButton) ui.stopButton.addEventListener("click", () => {
      if (state.abortController) state.abortController.abort();
    });
    if (ui.errorClose) ui.errorClose.addEventListener("click", hideError);
    if (ui.sidebarToggle) ui.sidebarToggle.addEventListener("click", () => setSidebarOpen(!document.body.classList.contains("sidebar-open")));
    if (ui.sidebarScrim) ui.sidebarScrim.addEventListener("click", () => setSidebarOpen(false));
    if (ui.settingsButton) ui.settingsButton.addEventListener("click", () => openSettings("appearance"));
    if (ui.accountButton) ui.accountButton.addEventListener("click", () => openSettings("account"));
    if (ui.headerAccountButton) ui.headerAccountButton.addEventListener("click", () => openSettings("account"));
    document.querySelectorAll("[data-close-settings]").forEach((button) => button.addEventListener("click", closeSettings));
    if (ui.settingsModal) {
      ui.settingsModal.addEventListener("click", (event) => { if (event.target === ui.settingsModal) closeSettings(); });
      ui.settingsModal.addEventListener("close", () => {
        if (modalReturnFocus && typeof modalReturnFocus.focus === "function") modalReturnFocus.focus();
        modalReturnFocus = null;
      });
    }
    document.querySelectorAll("[data-settings-tab]").forEach((tab, index, allTabs) => {
      tab.addEventListener("click", () => setSettingsTab(tab.dataset.settingsTab));
      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const next = allTabs[(index + direction + allTabs.length) % allTabs.length];
        setSettingsTab(next.dataset.settingsTab);
        next.focus();
      });
    });
    if (ui.conversationSearch) ui.conversationSearch.addEventListener("input", () => {
      state.searchQuery = ui.conversationSearch.value || "";
      renderConversationsList();
    });
    if (ui.themeSelect) ui.themeSelect.addEventListener("change", () => {
      preferences.theme = ["auto", "light", "dark"].includes(ui.themeSelect.value) ? ui.themeSelect.value : "auto";
      persistPreference(STORAGE_THEME, preferences.theme);
      applyTheme();
    });
    if (ui.themeToggleButton) ui.themeToggleButton.addEventListener("click", () => {
      preferences.theme = preferences.theme === "light" ? "dark" : "light";
      if (ui.themeSelect) ui.themeSelect.value = preferences.theme;
      persistPreference(STORAGE_THEME, preferences.theme);
      applyTheme();
    });
    if (ui.fontSizeSelect) ui.fontSizeSelect.addEventListener("change", () => {
      preferences.fontSize = ["small", "normal", "large"].includes(ui.fontSizeSelect.value) ? ui.fontSizeSelect.value : "normal";
      persistPreference(STORAGE_FONT_SIZE, preferences.fontSize);
      applyTheme();
    });
    if (ui.enterToSendToggle) ui.enterToSendToggle.addEventListener("change", () => {
      preferences.enterToSend = ui.enterToSendToggle.checked;
      persistPreference(STORAGE_ENTER_TO_SEND, preferences.enterToSend);
    });
    if (ui.autoScrollToggle) ui.autoScrollToggle.addEventListener("change", () => {
      preferences.autoScroll = ui.autoScrollToggle.checked;
      persistPreference(STORAGE_AUTO_SCROLL, preferences.autoScroll);
    });
    if (ui.systemInstructions) ui.systemInstructions.addEventListener("input", () => {
      preferences.systemInstructions = ui.systemInstructions.value;
      persistPreference(STORAGE_SYSTEM_INSTRUCTIONS, preferences.systemInstructions);
    });
    if (ui.clearHistoryButton) ui.clearHistoryButton.addEventListener("click", clearConversationHistory);
    if (ui.signOutButton) ui.signOutButton.addEventListener("click", signOut);
    if (ui.attachButton) ui.attachButton.addEventListener("click", () => showError("File attachments are not enabled in this Cyrus build yet."));
    if (ui.fileInput) ui.fileInput.addEventListener("change", () => { ui.fileInput.value = ""; });
    document.querySelectorAll(".prompt-suggestion").forEach((button) => button.addEventListener("click", () => {
      const prompt = button.getAttribute("data-prompt");
      if (prompt) sendMessage(prompt);
    }));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") setSidebarOpen(false); });
    setSidebarOpen(false);
    renderAccountDetails();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
