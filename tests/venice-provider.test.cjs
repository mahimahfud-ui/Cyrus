const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Prefer cyrus-rebuild path, fall back to root
let edgePath;
try {
  edgePath = require.resolve("../cyrus-rebuild/supabase/functions/mahi-ai-chat/index.ts");
} catch (_) {
  edgePath = require.resolve("../supabase/functions/mahi-ai-chat/index.ts");
}
const edge = fs.readFileSync(edgePath, "utf8");

test("Venice AI is configured as an OpenAI-compatible chat provider", () => {
  assert.match(edge, /if \(name === "venice"\) return configuredSecret\(\["VENICE_API_KEY", "VENICEAI_API_KEY", "VENICE", "Venice AI"\]\)/);
  assert.match(edge, /https:\/\/api\.venice\.ai\/api\/v1\/chat\/completions/);
});

test("porn/NSFW text prompts are not locked to Venice only", () => {
  assert.ok(!edge.includes('preferred = ["venice"];'));
  assert.ok(edge.includes("function isPornRelatedPrompt"));
  assert.ok(edge.includes("FULL UNLOCK"));
});
