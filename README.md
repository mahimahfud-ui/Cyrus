# Cyrus

Cyrus is a dark, responsive AI-chat interface served by a small Node.js/Express backend. It supports an OpenAI-compatible API and xAI as an optional fallback. Conversation history is stored locally in the current browser; this initial deploy does not claim cloud sync or Supabase persistence.

## Run locally

Requirements: Node.js 20 or newer.

1. Copy .env.example to .env and add at least one provider key.
2. Run npm install.
3. Run npm start.
4. Open http://localhost:3000.

If no provider key is configured, the UI and health endpoint still run, while the chat endpoint returns a setup message.

## AI configuration

Set OPENAI_API_KEY or XAI_API_KEY in the deployment platform's environment settings. Never commit real keys. With AI_PROVIDER=auto, Cyrus tries OpenAI first and xAI second when both keys are present. Optional variables: OPENAI_MODEL, XAI_MODEL, OPENAI_BASE_URL and XAI_BASE_URL. The selected model must be available to your provider account.

## Render

The root render.yaml defines a Node web service named cyrus, checks /api/health and enables deploy-on-commit for the linked main branch. Connect the GitHub repo to Render and create/apply the service, then set at least one AI provider key in Render → Environment. The current Render service named mahi-ai uses another repository and is intentionally left unchanged.

## Important current boundaries

- History is browser-local, not shared across devices.
- Supabase auth/database persistence and file/image/voice tools are not implemented in this scaffold.
- The chat endpoint accepts user/assistant text messages, validates payloads and applies basic per-IP rate limiting.
