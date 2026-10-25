/* Cyrus is intentionally fresh: no AI provider is connected.
   Configure a provider later through a secure server-side integration before enabling chat. */
(() => {
  "use strict";
  function getAvailable() {
    return null;
  }
  async function call() {
    throw new Error("No AI provider is connected to Cyrus yet. The chatbot is intentionally unconfigured.");
  }
  window.CyrusProvider = Object.freeze({ getAvailable, call });
})();
