# 🤖 CYRUS IMPLEMENTATION GUIDE

**Complete instructions to get Cyrus AI chatbot running with Grok and ChatGPT**

---

## 📋 Table of Contents

1. [Quick Start (5 minutes)](#quick-start)
2. [Detailed Setup (30 minutes)](#detailed-setup)
3. [AI Provider Integration](#ai-provider-integration)
4. [Deployment](#deployment)
5. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18 or higher
- A Supabase account (free tier works fine)
- (Optional) Grok API key from xAI or ChatGPT API key from OpenAI

### 1-2-3 Start

```bash
# Clone/navigate to project
cd cyrus-rebuild

# Install (minimal dependencies)
npm install

# Configure Supabase
export SUPABASE_URL="your-project-url"
export SUPABASE_ANON_KEY="your-anon-key"

# Run
npm start

# Open browser
open http://localhost:3000
```

You'll see the Cyrus welcome screen. ✅

---

## Detailed Setup

### Step 1: Set Up Supabase Project

**1. Go to https://supabase.com and create a new project**

```
Name: Cyrus (or your choice)
Password: (strong password)
Region: Choose closest to you
```

**2. After project creation, get your credentials:**

Go to **Project Settings** → **API Keys**

Copy:
- **Project URL** - e.g., `https://xxxxx.supabase.co`
- **Anon Key** - Safe for frontend, starts with `eyJ...`

**Do NOT copy:** Service Role Key (keep this private!)

**3. Enable Anonymous Authentication**

Go to **Authentication** → **Providers**
- Find **Anonymous**
- Toggle **Enable Sign-ups** ON
- Click **Save**

This allows guests to use Cyrus without email/password.

### Step 2: Create Database Schema

**1. Open Supabase Dashboard**

Go to **SQL Editor** section

**2. Run each migration file in order**

Copy content from `supabase/migrations/` files and run in SQL Editor:

```bash
# Files to run (in this order):
1. 20261023075646_mahi_ai_core_schema.sql
2. 20261023083450_mahi_ai_file_attachments.sql
3. 20261024081817_mahi_ai_memory_system.sql
4. 20261024110000_production_hardening.sql
5. 20261024130000_mahi_ai_usage_observability.sql
6. 20261025010000_mahi_ai_admin_control.sql
```

For each file:
- Open in text editor
- Copy entire SQL content
- Paste in Supabase SQL Editor
- Click **Run**
- Wait for success message ✅

**3. Verify tables were created**

Go to **Table Editor** and confirm you see:
- `conversations`
- `messages`
- `users`
- `memory`
- etc.

### Step 3: Configure Cyrus

**Option A: Environment Variables (Recommended for production)**

```bash
# Create .env file in project root
echo "SUPABASE_URL=https://xxxxx.supabase.co" > .env
echo "SUPABASE_ANON_KEY=eyJ..." >> .env
echo "PORT=3000" >> .env
```

**Option B: Edit config.js (For quick testing)**

Edit `public/config.js`:

```javascript
window.CYRUS_CONFIG = {
  supabaseUrl: "https://xxxxx.supabase.co",
  supabaseAnonKey: "eyJ...",
  features: {
    conversations: true,
    memory: false,
    imageGeneration: false,
    voiceInput: false
  }
};
```

**Option C: URL Parameters (For demos)**

```
http://localhost:3000/?supabaseUrl=YOUR_URL&supabaseAnonKey=YOUR_KEY
```

### Step 4: Start the Server

```bash
npm start
```

Expected output:
```
MahiCloud web server listening on port 3000
```

### Step 5: Test in Browser

Open: `http://localhost:3000`

You should see:
- ✅ Cyrus welcome screen
- ✅ Sidebar with "New Chat" button
- ✅ Welcome greeting and suggested prompts
- ✅ Message input at bottom
- ✅ Settings icon in sidebar footer
- ✅ No JavaScript errors in console

**Try it:**

1. Click a suggested prompt OR type a message
2. Click Send
3. You'll see: **"AI provider is not configured. Grok or ChatGPT integration is required."**

This is correct! Now implement a provider.

---

## AI Provider Integration

### Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│ BROWSER (Cyrus)                                 │
│ ┌──────────────────────────────────────────┐   │
│ │ Provider Adapter (provider-adapter.js)   │   │
│ │ - Detects which provider is available    │   │
│ │ - Routes to correct endpoint             │   │
│ └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
              ↓ HTTP Request (POST)
┌─────────────────────────────────────────────────┐
│ YOUR BACKEND (Node.js, Express, etc.)           │
│ ┌──────────────────────────────────────────┐   │
│ │ POST /api/ai/chatgpt                     │   │
│ │ - Receives message from Cyrus            │   │
│ │ - Validates input                        │   │
│ │ - Calls OpenAI API with your API key     │   │
│ │ - Returns response to Cyrus              │   │
│ └──────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────┐   │
│ │ POST /api/ai/grok                        │   │
│ │ - Receives message from Cyrus            │   │
│ │ - Validates input                        │   │
│ │ - Calls xAI API with your API key        │   │
│ │ - Returns response to Cyrus              │   │
│ └──────────────────────────────────────────┘   │
│ Environment Variables:                          │
│ OPENAI_API_KEY=sk-...                          │
│ XAI_API_KEY=sk-...                             │
└─────────────────────────────────────────────────┘
        ↓ Secure API Call        ↓ Secure API Call
  ┌─────────────────────┐  ┌───────────────────┐
  │ OpenAI API          │  │ xAI / Grok API    │
  │ api.openai.com      │  │ api.x.ai          │
  └─────────────────────┘  └───────────────────┘
```

### Choice: Grok or ChatGPT or Both?

You can implement:
- **ChatGPT only** - Most widely used, reliable
- **Grok only** - Newer, performant
- **Both** - Users can choose which provider

For simplicity, start with **ChatGPT**.

---

## Option 1: ChatGPT (OpenAI)

### Prerequisites

1. **Get OpenAI API Key**
   - Go to https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)
   - Keep it secret! Store in `.env` only

2. **Have a backend server ready**
   - Can be the same Node.js server
   - Or separate Express app
   - Must handle `POST /api/ai/chatgpt`

### Step 1: Create Backend Endpoint

Add to your `server.js` or Express app:

```javascript
// POST /api/ai/chatgpt
app.post("/api/ai/chatgpt", async (req, res) => {
  try {
    // 1. Validate request
    const { message, history, systemInstructions } = req.body;
    
    if (!message || typeof message !== "string" || message.length > 10000) {
      return res.status(400).json({ error: "Invalid message" });
    }

    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ error: "Invalid history" });
    }

    // 2. Build messages for OpenAI
    const messages = [];
    
    if (systemInstructions && systemInstructions.length > 0) {
      messages.push({ role: "system", content: systemInstructions });
    }
    
    // Add conversation history
    for (const msg of history) {
      if (msg.role && msg.content) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    
    // Add current message
    messages.push({ role: "user", content: message });

    // 3. Call OpenAI API
    console.log(`[ChatGPT] Calling with ${messages.length} messages`);
    
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",      // or "gpt-4" for older version
          messages: messages,
          temperature: 0.7,          // 0-1: lower = more focused, higher = more creative
          max_tokens: 2000,          // Max response length
          top_p: 1.0                 // Nucleus sampling
        })
      }
    );

    // 4. Handle API response
    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      console.error("[ChatGPT] API error:", error);
      return res.status(500).json({ error: "OpenAI API error" });
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices[0].message.content;

    // 5. Log usage (optional but recommended)
    console.log(`[ChatGPT] Usage: prompt=${openaiData.usage.prompt_tokens}, completion=${openaiData.usage.completion_tokens}`);

    // 6. Return to Cyrus
    res.json({
      response: assistantMessage,
      usage: {
        promptTokens: openaiData.usage.prompt_tokens,
        completionTokens: openaiData.usage.completion_tokens,
        totalTokens: openaiData.usage.total_tokens
      }
    });

  } catch (error) {
    console.error("[ChatGPT] Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
```

### Step 2: Set API Key in Environment

```bash
# In .env file
OPENAI_API_KEY=sk-proj-xxxxx...

# Or export for current session
export OPENAI_API_KEY="sk-proj-xxxxx..."
```

**Never commit `.env` to git!**

### Step 3: Enable in provider-adapter.js

Edit `public/provider-adapter.js`:

Find `PROVIDER_CONFIG`:

```javascript
const PROVIDER_CONFIG = {
  grok: {
    enabled: false,
    // ... keep as is
  },
  chatgpt: {
    enabled: true,  // ← CHANGE THIS
    apiKey: null,   // Leave as null
    model: "gpt-4-turbo",
    baseUrl: "https://api.openai.com/v1"
  }
};
```

### Step 4: Test

```bash
# 1. Restart server
npm start

# 2. Open http://localhost:3000

# 3. Type a message in Cyrus

# 4. Watch server logs for:
# [ChatGPT] Calling with 1 messages
# [ChatGPT] Usage: prompt=XX, completion=YY

# 5. Cyrus should show the response!
```

**If you get an error:**

Check:
- Is `OPENAI_API_KEY` in `.env`?
- Is it a valid key (starts with `sk-`)?
- Does endpoint `/api/ai/chatgpt` exist?
- Can you call it directly: `curl -X POST http://localhost:3000/api/ai/chatgpt ...`?

---

## Option 2: Grok (xAI)

Similar to ChatGPT, but different API.

### Prerequisites

1. **Get Grok API Key**
   - Go to https://console.x.ai
   - Create API key
   - Copy key (starts with `xai-`)

2. **Backend endpoint: POST /api/ai/grok**

### Step 1: Create Backend Endpoint

```javascript
// POST /api/ai/grok
app.post("/api/ai/grok", async (req, res) => {
  try {
    const { message, history, systemInstructions } = req.body;
    
    // Validate
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Invalid message" });
    }

    // Build messages
    const messages = [];
    if (systemInstructions) {
      messages.push({ role: "system", content: systemInstructions });
    }
    messages.push(...history);
    messages.push({ role: "user", content: message });

    // Call xAI API
    const grokResponse = await fetch(
      "https://api.x.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "grok-beta",
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000
        })
      }
    );

    if (!grokResponse.ok) {
      const error = await grokResponse.json();
      console.error("[Grok] API error:", error);
      return res.status(500).json({ error: "Grok API error" });
    }

    const grokData = await grokResponse.json();
    res.json({
      response: grokData.choices[0].message.content,
      usage: {
        promptTokens: grokData.usage.prompt_tokens,
        completionTokens: grokData.usage.completion_tokens,
        totalTokens: grokData.usage.total_tokens
      }
    });

  } catch (error) {
    console.error("[Grok] Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
```

### Step 2: Set API Key

```bash
export XAI_API_KEY="xai-xxxxx..."
```

### Step 3: Enable in provider-adapter.js

```javascript
const PROVIDER_CONFIG = {
  grok: {
    enabled: true,  // ← CHANGE THIS
    apiKey: null,
    model: "grok-beta",
    baseUrl: "https://api.x.ai/v1"
  },
  chatgpt: {
    enabled: false,
    // ...
  }
};
```

### Step 4: Test

Same as ChatGPT - type a message and get a response.

---

## Production Setup

### Before Deploying to Users

Implement this checklist:

**Security**
- [ ] API keys in `.env`, never in code
- [ ] `.env` in `.gitignore`
- [ ] CORS configured for your domain only
- [ ] Input validation on all requests
- [ ] Error messages don't leak API details
- [ ] HTTPS enforced

**Reliability**
- [ ] Rate limiting (per user, per IP)
- [ ] Request timeout (30-60 seconds)
- [ ] Retry logic with backoff
- [ ] Error handling and fallbacks
- [ ] Monitoring and logging

**Performance**
- [ ] Response caching (if appropriate)
- [ ] Token usage tracking
- [ ] Request queuing for high load
- [ ] Database connection pooling

**Monitoring**
- [ ] API error logging
- [ ] Token usage alerts
- [ ] Cost tracking
- [ ] Uptime monitoring
- [ ] Error rate alerts

### Example: Full Production Stack

```javascript
// Complete Node.js + Express server with ChatGPT

const express = require("express");
const rateLimit = require("express-rate-limit");
const app = express();

app.use(express.json());

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later"
});
app.use("/api/", limiter);

// Middleware: validate API key
function authenticateRequest(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token || !isValidToken(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.userId = extractUserId(token);
  next();
}

// ChatGPT endpoint
app.post("/api/ai/chatgpt", authenticateRequest, async (req, res) => {
  const timeout = setTimeout(() => {
    res.status(408).json({ error: "Request timeout" });
  }, 60000); // 60 second timeout

  try {
    const { message, history, systemInstructions } = req.body;
    
    // Validate
    if (!message || message.length > 10000) {
      return res.status(400).json({ error: "Invalid message" });
    }

    // Log usage
    console.log({
      timestamp: new Date().toISOString(),
      userId: req.userId,
      provider: "chatgpt",
      messageLength: message.length,
      historyLength: history?.length || 0
    });

    // Build request to OpenAI
    const messages = [
      ...(systemInstructions ? [{ role: "system", content: systemInstructions }] : []),
      ...(history || []),
      { role: "user", content: message }
    ];

    // Call OpenAI with timeout
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), 55000);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 2000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutHandle);

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI error:", error);
      
      // Track errors
      incrementErrorCounter("openai_api_error");
      
      if (response.status === 429) {
        return res.status(429).json({ error: "Rate limited, please try again" });
      }
      return res.status(500).json({ error: "AI provider error" });
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Log success and usage
    console.log({
      timestamp: new Date().toISOString(),
      userId: req.userId,
      status: "success",
      tokens: data.usage.total_tokens,
      cost: estimateCost(data.usage.total_tokens)
    });

    // Alert on high cost
    if (data.usage.total_tokens > 5000) {
      alertSlack(`High token usage: ${data.usage.total_tokens} tokens`);
    }

    // Return response
    res.json({
      response: assistantMessage,
      usage: data.usage
    });

  } catch (error) {
    clearTimeout(timeout);
    
    if (error.name === "AbortError") {
      return res.status(408).json({ error: "Request timeout" });
    }

    console.error("Server error:", error);
    incrementErrorCounter("server_error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

---

## Deployment Options

### Option 1: Render (Easiest for Node.js)

```bash
# 1. Push code to GitHub
git add .
git commit -m "Initial Cyrus deployment"
git push origin main

# 2. Go to https://render.com
# 3. Connect GitHub account
# 4. New → Web Service
# 5. Select your repo
# 6. Settings:
#    - Environment: Node
#    - Build Command: npm install
#    - Start Command: npm start
#    - Environment Variables:
#      SUPABASE_URL=...
#      SUPABASE_ANON_KEY=...
#      OPENAI_API_KEY=... (or XAI_API_KEY)
# 7. Create Web Service
# 8. Watch deploy logs

# Done! Your Cyrus is live at https://xxxx-xxxx.onrender.com
```

### Option 2: Railway

Similar to Render, even easier. Go to https://railway.app

### Option 3: Docker + Self-Hosted

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t cyrus .
docker run -p 3000:3000 \
  -e SUPABASE_URL=$SUPABASE_URL \
  -e SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  cyrus
```

---

## Troubleshooting

### "AI provider is not configured"

**Cause:** No provider is enabled.

**Fix:**
1. Check `provider-adapter.js`
2. Is `PROVIDER_CONFIG.chatgpt.enabled` or `grok.enabled` true?
3. Does backend endpoint exist?
4. Can you call it directly?

```bash
curl -X POST http://localhost:3000/api/ai/chatgpt \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "history": [],
    "systemInstructions": ""
  }'
```

### "OpenAI API error" or "Grok API error"

**Cause:** API key invalid, wrong endpoint, or API error.

**Fix:**
1. Check API key in `.env` is correct
2. Check it's not expired (OpenAI: re-generate if needed)
3. Check API has tokens/credits
4. Check request body is correct JSON
5. Check server logs for full error

### Messages not saving

**Cause:** Supabase not configured or migrations not run.

**Fix:**
1. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. Run migrations in Supabase dashboard
3. Enable anonymous auth in Supabase
4. Check table permissions (RLS)

### Server won't start

**Cause:** Port in use, missing env var, syntax error.

**Fix:**
```bash
# Check if port 3000 is in use
lsof -i :3000

# Start on different port
PORT=3001 npm start

# Check for syntax errors
node -c server.js
```

### CORS error in browser

**Cause:** Frontend and backend on different origins.

**Fix:**

Add CORS headers to endpoints:

```javascript
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
```

---

## Next Steps

1. **Immediate:** Set up Supabase + run migrations
2. **Today:** Implement ChatGPT endpoint
3. **This week:** Deploy to Render
4. **This month:** Add monitoring and cost alerts

---

## Support Resources

- **Cyrus Documentation:** `README-CYRUS.md`
- **Project Summary:** `REBUILD_SUMMARY.md`
- **Supabase Docs:** https://supabase.com/docs
- **OpenAI API Docs:** https://platform.openai.com/docs/api-reference
- **xAI Grok Docs:** https://docs.x.ai

---

**You're ready to launch Cyrus! 🚀**
