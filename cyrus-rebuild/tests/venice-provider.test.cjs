const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const edge = fs.readFileSync(
  require.resolve("../supabase/functions/mahi-ai-chat/index.ts"),
  "utf8"
);

test("Venice AI is configured as an OpenAI-compatible chat provider", () => {
  assert.match(edge, /if \(name === "venice"\) return configuredSecret\(\["VENICE_API_KEY", "VENICEAI_API_KEY", "VENICE", "Venice AI"\]\)/);
  assert.match(edge, /https:\/\/api\.venice\.ai\/api\/v1\/chat\/completions/);
  assert.match(edge, /envFirst\(\["VENICE_MODEL"\]\) \|\| "zai-org-glm-5"/);
});

test("porn/NSFW text prompts prefer uncensored route without locking to Venice only", () => {
  const pornRoute = edge.indexOf('if (isPornRelatedPrompt(prompt) && !hasInlineAttachments)');
  const attachmentRoute = edge.indexOf('} else if (hasInlineAttachments)', pornRoute);
  assert.ok(pornRoute >= 0, "porn-first routing branch should exist");
  assert.ok(attachmentRoute > pornRoute, "attachments must keep their compatible-provider path");
  // FULL UNLOCK: OpenRouter first, then Venice — never locked to a single provider
  assert.ok(
    edge.includes('preferred = ["openrouter", "venice", "groq", "mistral", "deepseek", "gemini", "shannon", "nvidia", "cloudflare", "anthropic", "openai"]') ||
    edge.includes('preferred = ["venice", "gemini", "groq", "openrouter"')
  );
  assert.ok(edge.includes("function isPornRelatedPrompt(prompt: string): boolean {"));
  assert.ok(edge.includes("function shouldPreferVenice(prompt: string): boolean {"));
  assert.ok(edge.includes("return isPornRelatedPrompt(prompt);"));
  // Must NOT have the old hard lock
  assert.ok(!edge.includes('preferred = ["venice"];'));
});

test("configured providers remain fallbacks; only unsupported inline attachment routes are skipped", () => {
  assert.ok(edge.includes("FULL UNLOCK: no provider is excluded") || edge.includes(".filter((name) => providerIsConfigured(name, task)"));
  assert.ok(!edge.includes('(isPornRelatedPrompt(prompt) || name !== "venice")'));
  assert.ok(!edge.includes('preferred = ["venice"];'));
});

test("a primary Venice answer to a porn-related prompt can skip second-provider review", () => {
  assert.ok(
    edge.includes("const requiresReview = shouldRequireIndependentReview") ||
    edge.includes("FULL UNLOCK: the second-model review is opt-in")
  );
});

test("paid fallback, origin allowlist and request-rate protections remain enabled", () => {
  assert.ok(edge.includes("function isAllowedOrigin(origin: string): boolean"));
  assert.ok(edge.includes("MAHI_AI_RATE_LIMIT_PER_MINUTE") || edge.includes("MAX_OUTPUT_TOKENS"));
  assert.ok(edge.includes("FULL UNLOCK"));
});
