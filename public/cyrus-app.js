/** ============================================================================
 * CYRUS - AI CHATBOT
 * Premium AI conversational interface with Grok and ChatGPT integration points
 * ============================================================================ */

(() => {
  "use strict";

  const cfg = window.CYRUS_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => document.querySelectorAll(selector);

  // =========================================================================
  // STORAGE KEYS
  // =========================================================================
  const STORAGE_THEME = "cyrus-theme";
  const STORAGE_FONT_SIZE = "cyrus-font-size";
  const STORAGE_ENTER_TO_SEND = "cyrus-enter-to-send";
  const STORAGE_AUTO_SCROLL = "cyrus-auto-scroll";
  const STORAGE_SYSTEM_INSTRUCTIONS = "cyrus-system-instructions";
  const STORAGE_DISPLAY_NAME = "cyrus-display-name";

  // =========================================================================
  // DEFAULT PREFERENCES
  // =========================================================================
  const DEFAULT_PREFERENCES = {
    theme: "auto",
    fontSize: "normal",
    enterToSend: true,
    autoScroll: true,
    systemInstructions: ""
  };

  let preferences = { ...DEFAULT_PREFERENCES };

  // =========================================================================
  // DOM ELEMENTS
  // =========================================================================
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
    accountModal: $("accountModal"),
    themeSelect: $("themeSelect"),
    fontSizeSelect: $("fontSizeSelect"),
    enterToSendToggle: $("enterToSendToggle"),
    autoScrollToggle: $("autoScrollToggle"),
    systemInstructions: $("systemInstructions"),
    clearHistoryButton: $("clearHistoryButton"),
    signOutButton: $("signOutButton"),
    accountContent: $("accountContent")
  };

  // =========================================================================
  // STATE
  // =========================================================================
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

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  async function init() {
    console.log("🤖 Cyrus initializing...");
    
    // Load preferences
    loadPreferences();
    
    // Apply theme
    applyTheme();
    
    // Initialize event listeners
    initEventListeners();
    
    // Try to initialize Supabase
    try {
      await initSupabase();
      await authenticateUser();
      await loadConversations();
    } catch (error) {
      console.warn("Supabase initialization failed:", error);
      showError("Could not connect to Supabase. Check your configuration.");
    }
    
    // Show welcome state
    showWelcomeState();
    
    console.log("✅ Cyrus ready");
  }

  // =========================================================================
  // SUPABASE INTEGRATION
  // =========================================================================
  async function initSupabase() {
    // Check if Supabase credentials are configured
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      console.warn("Supabase credentials not configured. Some features will be unavailable.");
      return;
    }

    // Load Supabase client from CDN
    const supabaseScript = document.createElement("script");
    supabaseScript.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    
    return new Promise((resolve, reject) => {
      supabaseScript.onload = async () => {
        try {
          const { createClient } = window.supabase;
          state.supabaseClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
          console.log("✅ Supabase initialized");
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
        // Try anonymous sign in
        const { data: anonData, error: anonError } = await state.supabaseClient.auth.signInAnonymously();
        if (anonError) throw anonError;
        state.currentUser = anonData.session.user;
      }
    } catch (error) {
      console.error("Authentication error:", error);
      showError("Authentication failed. Some features may be unavailable.");
    }
  }

  // =========================================================================
  // CONVERSATIONS
  // =========================================================================
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
    ui.conversationsList.innerHTML = "";

    if (state.conversations.length === 0) {
      ui.conversationsList.innerHTML = '<div class="empty-state">No conversations yet</div>';
      return;
    }

    // Group conversations by date
    const grouped = groupConversationsByDate(state.conversations);

    for (const [dateGroup, conversations] of Object.entries(grouped)) {
      conversations.forEach(conv => {
        const item = document.createElement("button");
        item.className = "conversation-item" + (conv.id === state.currentConversationId ? " active" : "");
        item.innerHTML = `
          <div class="conversation-item-title">${escapeHtml(conv.title || "Untitled")}</div>
          <div class="conversation-item-date">${formatDate(conv.updated_at)}</div>
          <div class="conversation-item-actions">
            <button class="conversation-item-action" data-action="rename" title="Rename">
              <svg class="icon-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="conversation-item-action" data-action="delete" title="Delete">
              <svg class="icon-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        `;
        
        item.addEventListener("click", (e) => {
          if (e.target.closest(".conversation-item-action")) return;
          selectConversation(conv.id);
        });

        // Attach action handlers
        const actions = item.querySelectorAll(".conversation-item-action");
        actions.forEach(action => {
          action.addEventListener("click", (e) => {
            e.stopPropagation();
            const actionType = action.getAttribute("data-action");
            handleConversationAction(actionType, conv.id);
          });
        });

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
    ui.messagesList.innerHTML = "";
    
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
        .insert([{
          user_id: state.currentUser.id,
          title: "New Conversation"
        }])
        .select("id")
        .single();

      if (error) throw error;

      state.currentConversationId = data.id;
      state.messages = [];
      ui.messagesList.innerHTML = "";
      
      await loadConversations();
      showWelcomeState();
    } catch (error) {
      console.error("Failed to create conversation:", error);
      showError("Could not create new conversation");
    }
  }

  async function handleConversationAction(action, conversationId) {
    if (action === "delete") {
      if (!confirm("Delete this conversation? This action cannot be undone.")) return;
      try {
        const { error } = await state.supabaseClient
          .from("conversations")
          .delete()
          .eq("id", conversationId);

        if (error) throw error;
        
        if (state.currentConversationId === conversationId) {
          state.currentConversationId = null;
          showWelcomeState();
        }
        
        await loadConversations();
      } catch (error) {
        console.error("Failed to delete conversation:", error);
        showError("Could not delete conversation");
      }
    } else if (action === "rename") {
      const conversation = state.conversations.find(c => c.id === conversationId);
      const newTitle = prompt("New title:", conversation.title || "");
      if (!newTitle) return;

      try {
        const { error } = await state.supabaseClient
          .from("conversations")
          .update({ title: newTitle })
          .eq("id", conversationId);

        if (error) throw error;
        await loadConversations();
      } catch (error) {
        console.error("Failed to rename conversation:", error);
        showError("Could not rename conversation");
      }
    }
  }

  // =========================================================================
  // MESSAGING
  // =========================================================================
  async function sendMessage(text) {
    if (!text.trim()) return;
    if (state.isSending) return;
    
    // Check if AI provider is configured
    const hasProvider = isAIProviderConfigured();
    if (!hasProvider) {
      showError("No AI provider is connected to Cyrus. It is intentionally fresh and unconfigured.");
      return;
    }

    state.isSending = true;
    ui.sendButton.hidden = true;
    ui.stopButton.hidden = false;
    state.abortController = new AbortController();

    try {
      // Ensure we have a conversation
      if (!state.currentConversationId) {
        await startNewConversation();
      }

      // Save user message
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
      renderMessages();
      showChatState();
      
      ui.messageInput.value = "";
      ui.messageInput.style.height = "auto";
      
      // Show loading indicator
      addLoadingMessage();
      scrollToBottom();

      // Call AI provider
      const response = await callAIProvider(text);

      if (response) {
        // Save assistant message
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

        // Update conversation title if it's new
        const conversation = state.conversations.find(c => c.id === state.currentConversationId);
        if (conversation.title === "New Conversation" || !conversation.title) {
          const title = generateTitle(text);
          await state.supabaseClient
            .from("conversations")
            .update({ title })
            .eq("id", state.currentConversationId);
          await loadConversations();
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
      ui.sendButton.hidden = false;
      ui.stopButton.hidden = true;
      removeLoadingMessage();
      ui.messageInput.focus();
    }
  }

  function addLoadingMessage() {
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
    const loading = ui.messagesList.querySelector(".message-loading");
    if (loading) {
      loading.closest(".message").remove();
    }
  }

  function renderMessages() {
    ui.messagesList.innerHTML = "";

    state.messages.forEach(msg => {
      const messageEl = document.createElement("div");
      messageEl.className = `message ${msg.role}`;
      
      const avatar = `<div class="message-avatar">${msg.role === "user" ? "You" : "C"}</div>`;
      const content = `<div class="message-content"><div class="message-text">${formatMessageContent(msg.content)}</div></div>`;
      const actions = msg.role === "assistant" ? `
        <div class="message-actions">
          <button class="message-action-btn" title="Copy" data-action="copy" data-content="${escapeHtml(msg.content)}">
            <svg class="icon-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
          </button>
        </div>
      ` : "";

      messageEl.innerHTML = avatar + content + actions;
      ui.messagesList.appendChild(messageEl);
    });

    // Attach copy handlers
    $$('[data-action="copy"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const content = btn.getAttribute("data-content");
        navigator.clipboard.writeText(content).then(() => {
          btn.textContent = "Copied!";
          setTimeout(() => {
            btn.innerHTML = '<svg class="icon-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';
          }, 2000);
        });
      });
    });
  }

  function formatMessageContent(content) {
    // Simple markdown-like formatting
    let html = escapeHtml(content);
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    
    // Italic
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    
    // Code
    html = html.replace(/`(.*?)`/g, "<code>$1</code>");
    
    // Line breaks
    html = html.replace(/\n/g, "<br>");
    
    return html;
  }

  // =========================================================================
  // AI PROVIDER INTEGRATION
  // =========================================================================
  function isAIProviderConfigured() {
    // No provider is configured in this fresh deployment.
    if (!window.CyrusProvider) return false;
    return window.CyrusProvider.getAvailable() !== null;
  }

  async function callAIProvider(_userMessage) {
    // Deliberately disabled until the owner explicitly configures a provider.
    showError("No AI provider is connected yet. Cyrus is running in fresh, unconfigured mode.");
    return null;
  }

  // =========================================================================
  // UI STATE MANAGEMENT
  // =========================================================================
  function showWelcomeState() {
    ui.welcomeContainer.hidden = false;
    ui.chatMessagesContainer.hidden = true;
  }

  function showChatState() {
    ui.welcomeContainer.hidden = true;
    ui.chatMessagesContainer.hidden = false;
  }

  function scrollToBottom() {
    if (preferences.autoScroll) {
      ui.messagesScrollContainer.scrollTop = ui.messagesScrollContainer.scrollHeight;
    }
  }

  function showError(message) {
    ui.errorMessage.textContent = message;
    ui.errorBanner.hidden = false;
  }

  function hideError() {
    ui.errorBanner.hidden = true;
    ui.errorMessage.textContent = "";
  }

  // =========================================================================
  // PREFERENCES
  // =========================================================================
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

    // Update UI
    ui.themeSelect.value = theme;
    ui.fontSizeSelect.value = fontSize;
    ui.enterToSendToggle.checked = preferences.enterToSend;
    ui.autoScrollToggle.checked = preferences.autoScroll;
    ui.systemInstructions.value = systemInstructions;
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
      document.documentElement.style.colorScheme = "light";
    } else if (theme === "dark") {
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.style.colorScheme = "light dark";
    }
  }

  // =========================================================================
  // ACCOUNT
  // =========================================================================
  function updateAccountDisplay() {
    if (!state.currentUser) return;

    const email = state.currentUser.email || "Guest";
    const userId = state.currentUser.id.substring(0, 8);

    ui.accountContent.innerHTML = `
      <div class="account-item">
        <div class="account-label">Email</div>
        <div class="account-value">${escapeHtml(email)}</div>
      </div>
      <div class="account-item">
        <div class="account-label">User ID</div>
        <div class="account-value"><code>${escapeHtml(userId)}...</code></div>
      </div>
      <div class="account-item">
        <div class="account-label">Status</div>
        <div class="account-value">Authenticated</div>
      </div>
    `;
  }

  async function signOut() {
    if (!state.supabaseClient) return;

    try {
      const { error } = await state.supabaseClient.auth.signOut();
      if (error) throw error;

      state.currentUser = null;
      state.currentConversationId = null;
      state.messages = [];
      ui.messagesList.innerHTML = "";
      showWelcomeState();
      ui.accountModal.close();
      showError("Signed out successfully");
    } catch (error) {
      console.error("Sign out error:", error);
      showError("Failed to sign out");
    }
  }

  // =========================================================================
  // EVENT LISTENERS
  // =========================================================================
  function initEventListeners() {
    // Sidebar
    ui.sidebarToggle.addEventListener("click", closeSidebar);
    ui.sidebarScrim.addEventListener("click", closeSidebar);
    ui.newChatButton.addEventListener("click", () => {
      startNewConversation();
      closeSidebar();
    });

    // Search
    ui.conversationSearch.addEventListener("input", filterConversations);

    // Messages
    ui.messageForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = ui.messageInput.value.trim();
      if (text) sendMessage(text);
    });

    ui.messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && preferences.enterToSend) {
        e.preventDefault();
        const text = ui.messageInput.value.trim();
        if (text) sendMessage(text);
      }
    });

    ui.messageInput.addEventListener("input", () => {
      ui.messageInput.style.height = "auto";
      ui.messageInput.style.height = (ui.messageInput.scrollHeight) + "px";
    });

    ui.stopButton.addEventListener("click", () => {
      if (state.abortController) {
        state.abortController.abort();
      }
    });

    // Suggested prompts
    $$(".prompt-suggestion").forEach(btn => {
      btn.addEventListener("click", () => {
        const prompt = btn.getAttribute("data-prompt");
        ui.messageInput.value = prompt;
        ui.messageInput.style.height = "auto";
        ui.messageInput.style.height = (ui.messageInput.scrollHeight) + "px";
        ui.messageInput.focus();
      });
    });

    // Error banner
    ui.errorClose.addEventListener("click", hideError);

    // Settings
    ui.settingsButton.addEventListener("click", () => {
      ui.settingsModal.showModal();
      closeSidebar();
    });

    ui.themeSelect.addEventListener("change", (e) => {
      preferences.theme = e.target.value;
      applyTheme();
      savePreferences();
    });

    ui.fontSizeSelect.addEventListener("change", (e) => {
      preferences.fontSize = e.target.value;
      document.documentElement.style.fontSize = 
        e.target.value === "small" ? "14px" :
        e.target.value === "large" ? "18px" :
        "16px";
      savePreferences();
    });

    ui.enterToSendToggle.addEventListener("change", (e) => {
      preferences.enterToSend = e.target.checked;
      savePreferences();
    });

    ui.autoScrollToggle.addEventListener("change", (e) => {
      preferences.autoScroll = e.target.checked;
      savePreferences();
    });

    ui.systemInstructions.addEventListener("change", (e) => {
      preferences.systemInstructions = e.target.value;
      savePreferences();
    });

    ui.clearHistoryButton.addEventListener("click", clearHistory);

    const settingsModalClose = ui.settingsModal.querySelector(".modal-close");
    settingsModalClose.addEventListener("click", () => ui.settingsModal.close());

    // Account
    ui.accountButton.addEventListener("click", () => {
      ui.accountModal.showModal();
      closeSidebar();
    });

    ui.signOutButton.addEventListener("click", signOut);

    const accountModalClose = ui.accountModal.querySelector(".modal-close");
    accountModalClose.addEventListener("click", () => ui.accountModal.close());

    // Close modals on backdrop click
    $$(".modal-backdrop").forEach(backdrop => {
      backdrop.addEventListener("click", (e) => {
        const dialog = e.target.closest("dialog");
        if (dialog) dialog.close();
      });
    });
  }

  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
    ui.sidebarScrim.hidden = true;
    ui.sidebar.style.transform = "";
  }

  function filterConversations(e) {
    const query = e.target.value.toLowerCase();
    const items = ui.conversationsList.querySelectorAll(".conversation-item");
    
    items.forEach(item => {
      const title = item.querySelector(".conversation-item-title").textContent.toLowerCase();
      item.style.display = title.includes(query) ? "" : "none";
    });
  }

  async function clearHistory() {
    if (!confirm("Clear all conversation history? This action cannot be undone.")) return;

    try {
      const { error } = await state.supabaseClient
        .from("conversations")
        .delete()
        .eq("user_id", state.currentUser.id);

      if (error) throw error;

      state.currentConversationId = null;
      state.messages = [];
      state.conversations = [];
      ui.messagesList.innerHTML = "";
      renderConversationsList();
      showWelcomeState();
      showError("Conversation history cleared");
    } catch (error) {
      console.error("Failed to clear history:", error);
      showError("Could not clear history");
    }
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function generateTitle(text) {
    return text.substring(0, 50) + (text.length > 50 ? "..." : "");
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }

  // Start the application
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
