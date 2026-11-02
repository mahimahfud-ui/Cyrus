/**
 * Cyrus provider adapter.
 * Intentionally unconfigured until the owner explicitly authorizes an integration.
 * Provider credentials must stay server-side. Never call MahiCloud's Edge Function.
 */
(() => {
  "use strict";
  const SETUP_PENDING_MESSAGE = "AI setup is pending. Cyrus is not connected to an AI provider yet.";
  function getAvailableProvider() { return null; }
  async function callAIProvider() { throw new Error(SETUP_PENDING_MESSAGE); }
  window.CyrusProvider = Object.freeze({
    call: callAIProvider,
    getAvailable: getAvailableProvider,
    setupPendingMessage: SETUP_PENDING_MESSAGE,
    config: Object.freeze({ status: "setup-pending" })
  });
})();
