require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    frameAncestors: ["'none'"]
  }}
}));
app.use(express.json({ limit: '1mb' }));

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many chat requests. Please wait a little and try again.' }
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', app: 'cyrus', timestamp: new Date().toISOString() });
});

function configuredProviders() {
  const providers = {
    openai: process.env.OPENAI_API_KEY ? {
      name: 'OpenAI', baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    } : null,
    xai: process.env.XAI_API_KEY ? {
      name: 'xAI', baseUrl: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
      key: process.env.XAI_API_KEY, model: process.env.XAI_MODEL || 'grok-3-mini'
    } : null
  };
  const preference = (process.env.AI_PROVIDER || 'auto').toLowerCase();
  const order = preference === 'xai' ? ['xai', 'openai'] : preference === 'openai' ? ['openai', 'xai'] : ['openai', 'xai'];
  return order.filter((id) => providers[id]).map((id) => providers[id]);
}

async function callProvider(provider, messages) {
  const url = provider.baseUrl.replace(/\/$/, '') + '/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + provider.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: provider.model, messages, temperature: 0.7, max_tokens: 1800 }),
    signal: AbortSignal.timeout(60000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('AI provider request failed');
    error.status = response.status;
    throw error;
  }
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('AI provider returned an empty response');
  return content.trim();
}

app.post('/api/chat', chatLimiter, async (req, res) => {
  const incoming = req.body && req.body.messages;
  if (!Array.isArray(incoming) || incoming.length < 1 || incoming.length > 30) {
    return res.status(400).json({ error: 'Send a valid conversation containing 1 to 30 messages.' });
  }
  const messages = [];
  for (const item of incoming) {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || item.content.length > 12000) {
      return res.status(400).json({ error: 'A message is invalid or too long.' });
    }
    messages.push({ role: item.role, content: item.content });
  }
  if (messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'The latest message must be from the user.' });
  }
  messages.unshift({ role: 'system', content: 'You are Cyrus, a helpful, accurate AI assistant. Answer clearly and directly. Use the user’s language where practical. Do not claim to have performed actions you did not perform.' });
  const providers = configuredProviders();
  if (!providers.length) {
    return res.status(503).json({ error: 'AI is not configured yet. Add OPENAI_API_KEY or XAI_API_KEY in Render → Cyrus → Environment, then redeploy.' });
  }
  for (const provider of providers) {
    try {
      const answer = await callProvider(provider, messages);
      return res.json({ reply: answer });
    } catch (error) {
      console.error('Provider attempt failed:', provider.name, error.status || error.name || 'unknown error');
    }
  }
  return res.status(502).json({ error: 'All configured AI providers failed. Check the API key, model name, provider quota, and Render logs.' });
});

app.use(express.static(PUBLIC_DIR, { extensions: ['html'], maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.get('*', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
app.use((err, _req, res, _next) => {
  console.error('Request error:', err && err.message ? err.message : 'unknown');
  if (res.headersSent) return;
  res.status(err && err.status === 413 ? 413 : 500).json({ error: err && err.status === 413 ? 'Request is too large.' : 'Unexpected server error.' });
});

const server = app.listen(PORT, '0.0.0.0', () => console.log('Cyrus listening on port ' + PORT));
function shutdown(signal) {
  console.log(signal + ' received; closing Cyrus server');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 25000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
