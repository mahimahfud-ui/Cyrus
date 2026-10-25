/** ============================================================================
 * AI PROVIDER ADAPTER FOR CYRUS
 * 
 * This module defines the interface for AI provider integration.
 * Currently, both Grok (xAI) and ChatGPT (OpenAI) are left unconfigured.
 * 
 * INTEGRATION INSTRUCTIONS:
 * 
 * 1. GROK (xAI) INTEGRATION:
 *    - Implement the `callGrok()` function below
 *    - Requires xAI API key stored securely (not in frontend)
 *    - API documentation: https://docs.x.ai/api
 *    - Stream responses using the standard chat completion interface
 *
 * 2. CHATGPT (OpenAI) INTEGRATION:
 *    - Implement the `callChatGPT()` function below
 *    - Requires OpenAI API key stored securely (not in frontend)
 *    - API documentation: https://platform.openai.com/docs/api-reference
 *    - Use gpt-4 or gpt-4-turbo for best results
 *
 * 3. SECURITY NOTES:
 *    - NEVER expose API keys in frontend code
 *    - Use a backend proxy server to handle API requests
 *    - Implement proper authentication and rate limiting
 *    - Validate all user inputs before sending to providers
 *
 * ============================================================================ */

(() => {
  "use strict";

  // =========================================================================
  // CONFIGURATION
  // =========================================================================
  const PROVIDER_CONFIG = {
    grok: {
      enabled: false,
      apiKey: null,
      model: "grok-beta",
      baseUrl: "https://api.x.ai/v1"
    },
    chatgpt: {
      enabled: false,
      apiKey: null,
      model: "gpt-4-turbo",
      baseUrl: "https://api.openai.com/v1"
    }
  };

  // =========================================================================
  // PROVIDER SELECTION & ROUTING
  // =========================================================================

  /**
   * Determine which provider is available and select one
   * Priority: User preference > Grok > ChatGPT > None
   */
  function getAvailableProvider() {
    const userPreference = localStorage.getItem("cyrus-preferred-provider");
    
    if (userPreference === "grok" && PROVIDER_CONFIG.grok.enabled) {
      return "grok";
    }
    if (userPreference === "chatgpt" && PROVIDER_CONFIG.chatgpt.enabled) {
      return "chatgpt";
    }

    // Fall back to first available
    if (PROVIDER_CONFIG.grok.enabled) return "grok";
    if (PROVIDER_CONFIG.chatgpt.enabled) return "chatgpt";
    
    return null;
  }

  /**
   * Main entry point for AI provider calls
   * @param {string} userMessage - The user's message
   * @param {Array} conversationHistory - Previous messages in the conversation
   * @param {string} systemInstructions - Custom instructions for the AI
   * @returns {Promise<string|null>} The AI response or null if no provider
   */
  async function callAIProvider(userMessage, conversationHistory = [], systemInstructions = "") {
    const provider = getAvailableProvider();

    if (!provider) {
      console.warn("No AI provider is configured");
      return null;
    }

    try {
      if (provider === "grok") {
        return await callGrok(userMessage, conversationHistory, systemInstructions);
      } else if (provider === "chatgpt") {
        return await callChatGPT(userMessage, conversationHistory, systemInstructions);
      }
    } catch (error) {
      console.error(`Provider error (${provider}):`, error);
      throw error;
    }
  }

  // =========================================================================
  // GROK (xAI) INTEGRATION POINT
  // =========================================================================

  /**
   * Call Grok API via backend proxy
   * 
   * IMPLEMENTATION CHECKLIST:
   * [ ] Create backend endpoint that authenticates with xAI API
   * [ ] Validate API key in backend only (never in frontend)
   * [ ] Handle streaming responses
   * [ ] Implement retry logic with exponential backoff
   * [ ] Add request timeout (suggest 30-60 seconds)
   * [ ] Log provider usage for monitoring
   * 
   * BACKEND ENDPOINT EXAMPLE:
   *   POST /api/ai/grok
   *   Body: {
   *     "message": "...",
   *     "history": [...],
   *     "systemInstructions": "..."
   *   }
   *   Response: {
   *     "response": "...",
   *     "usage": { "tokens": ... }
   *   }
   * 
   * @param {string} userMessage
   * @param {Array} conversationHistory
   * @param {string} systemInstructions
   * @returns {Promise<string>} The Grok response
   */
  async function callGrok(userMessage, conversationHistory, systemInstructions) {
    // PLACEHOLDER: This function will be implemented when Grok integration is set up
    // For now, it throws an error indicating the provider is not configured

    throw new Error(
      "Grok provider is not yet configured. " +
      "To use Grok, implement the callGrok() function in provider-adapter.js. " +
      "See the documentation in that file for integration steps."
    );

    // FUTURE IMPLEMENTATION PATTERN:
    // try {
    //   const response = await fetch("/api/ai/grok", {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       "Authorization": `Bearer ${AUTH_TOKEN}`
    //     },
    //     body: JSON.stringify({
    //       message: userMessage,
    //       history: conversationHistory,
    //       systemInstructions: systemInstructions
    //     })
    //   });
    //
    //   if (!response.ok) {
    //     throw new Error(`Grok API error: ${response.status}`);
    //   }
    //
    //   // Handle streaming
    //   const reader = response.body.getReader();
    //   const decoder = new TextDecoder();
    //   let fullResponse = "";
    //
    //   while (true) {
    //     const { done, value } = await reader.read();
    //     if (done) break;
    //     fullResponse += decoder.decode(value, { stream: true });
    //   }
    //
    //   return fullResponse;
    // } catch (error) {
    //   console.error("Grok call failed:", error);
    //   throw error;
    // }
  }

  // =========================================================================
  // CHATGPT (OpenAI) INTEGRATION POINT
  // =========================================================================

  /**
   * Call ChatGPT API via backend proxy
   * 
   * IMPLEMENTATION CHECKLIST:
   * [ ] Create backend endpoint that authenticates with OpenAI API
   * [ ] Validate API key in backend only (never in frontend)
   * [ ] Use GPT-4 or GPT-4 Turbo model
   * [ ] Handle streaming responses for real-time output
   * [ ] Implement token counting and cost tracking
   * [ ] Add request timeout (suggest 30-60 seconds)
   * [ ] Implement rate limiting on backend
   * [ ] Log provider usage for monitoring and billing
   * 
   * BACKEND ENDPOINT EXAMPLE:
   *   POST /api/ai/chatgpt
   *   Body: {
   *     "message": "...",
   *     "history": [...],
   *     "systemInstructions": "..."
   *   }
   *   Response: {
   *     "response": "...",
   *     "usage": {
   *       "promptTokens": ...,
   *       "completionTokens": ...,
   *       "totalTokens": ...
   *     }
   *   }
   * 
   * @param {string} userMessage
   * @param {Array} conversationHistory
   * @param {string} systemInstructions
   * @returns {Promise<string>} The ChatGPT response
   */
  async function callChatGPT(userMessage, conversationHistory, systemInstructions) {
    // PLACEHOLDER: This function will be implemented when ChatGPT integration is set up
    // For now, it throws an error indicating the provider is not configured

    throw new Error(
      "ChatGPT provider is not yet configured. " +
      "To use ChatGPT, implement the callChatGPT() function in provider-adapter.js. " +
      "See the documentation in that file for integration steps."
    );

    // FUTURE IMPLEMENTATION PATTERN:
    // try {
    //   const messages = [
    //     ...(systemInstructions ? [{ role: "system", content: systemInstructions }] : []),
    //     ...conversationHistory.map(msg => ({
    //       role: msg.role,
    //       content: msg.content
    //     })),
    //     { role: "user", content: userMessage }
    //   ];
    //
    //   const response = await fetch("/api/ai/chatgpt", {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       "Authorization": `Bearer ${AUTH_TOKEN}`
    //     },
    //     body: JSON.stringify({
    //       model: "gpt-4-turbo",
    //       messages: messages,
    //       temperature: 0.7,
    //       max_tokens: 2000,
    //       top_p: 1
    //     })
    //   });
    //
    //   if (!response.ok) {
    //     throw new Error(`OpenAI API error: ${response.status}`);
    //   }
    //
    //   const data = await response.json();
    //   return data.choices[0].message.content;
    // } catch (error) {
    //   console.error("ChatGPT call failed:", error);
    //   throw error;
    // }
  }

  // =========================================================================
  // EXPORT FOR USE IN MAIN APP
  // =========================================================================

  // Make provider available to main application
  window.CyrusProvider = {
    call: callAIProvider,
    getAvailable: getAvailableProvider,
    config: PROVIDER_CONFIG
  };

})();
