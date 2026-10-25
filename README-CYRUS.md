# 🤖 CYRUS - AI Chatbot

A completely redesigned, premium AI conversational interface built with a modern design system, ready for Grok (xAI) and ChatGPT (OpenAI) integration.

## ✨ What's New in Cyrus

Cyrus is a **complete rebuild** of the MahiCloud AI chatbot with:

- ✅ **Completely new design system** - Deep charcoal foundation, cyan accent (#0ea5e9), refined typography
- ✅ **Premium visual identity** - Distinctive Cyrus branding with custom SVG logo
- ✅ **Modern UI components** - Sidebar, modals, composer, responsive layouts
- ✅ **Fresh interaction patterns** - Smooth animations, refined hover states, touch-friendly mobile
- ✅ **Clean provider architecture** - Ready for Grok and ChatGPT integration via provider adapter
- ✅ **Production-ready backend** - Supabase authentication, conversation persistence, RLS security
- ✅ **Fully responsive** - Desktop, tablet, and mobile layouts optimized
- ✅ **Accessibility-first** - WCAG 2.1 AA contrast, keyboard navigation, focus states, reduced-motion support
- ✅ **No fake AI responses** - Honest "Setup Pending" state when providers aren't configured

## 📋 System Requirements

- Node.js 18+
- Supabase project (free tier available)
- For AI responses: Backend proxy for Grok (xAI) and/or ChatGPT (OpenAI)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

Note: The project uses a minimal stack with native Node.js server and browser-standard APIs.

### 2. Configure Supabase

**Option A: Interactive Setup**

```bash
# Set environment variables
export SUPABASE_URL="your-project-url"
export SUPABASE_ANON_KEY="your-anon-key"
```

**Option B: Config File**

Edit `public/config.js` and update:
```javascript
window.CYRUS_CONFIG = {
  supabaseUrl: "your-project-url",
  supabaseAnonKey: "your-anon-key"
};
```

**Option C: URL Parameters**

```
http://localhost:3000/?supabaseUrl=YOUR_URL&supabaseAnonKey=YOUR_KEY
```

### 3. Initialize Supabase Database

Run the migrations in your Supabase project:

```bash
# Apply all migrations in supabase/migrations/ directory
# Using Supabase Dashboard: SQL Editor → Run each migration file
# Or using CLI: supabase db push
```

Key tables created:
- `conversations` - Chat session metadata
- `messages` - Individual messages with role/content
- `users` - User profiles (auto-managed by Supabase Auth)

### 4. Start the Server

```bash
npm start
```

The server starts on `http://localhost:3000`

Default configuration:
- Port: 3000 (set via `PORT` environment variable)
- Static files served from `public/`
- Compression: Brotli + Gzip
- Cache: ETag-based with 304 responses

### 5. Open in Browser

```
http://localhost:3000
```

You'll see:
- ✅ New Cyrus interface fully loaded and responsive
- ✅ Welcome state with suggested prompts
- ✅ Sidebar with conversation management
- ✅ Settings and account modals
- ✅ "Setup Pending" message when trying to send (no providers configured)

## 🔌 AI Provider Integration

### Architecture

Cyrus uses a **provider adapter pattern** for clean AI integration:

```
Frontend (Cyrus) 
    ↓
provider-adapter.js (routing layer)
    ↓
Backend Proxy (YOU BUILD)
    ↓
Grok API (xAI) OR ChatGPT API (OpenAI)
```

**Why this approach?**
- 🔒 API keys never exposed in frontend
- 🌐 Cross-origin CORS handled by backend
- 📊 Usage tracking and rate limiting
- ⚡ Request queuing and retry logic
- 💰 Cost monitoring per provider

### Integration Points

#### 1. Grok (xAI)

**File:** `public/provider-adapter.js` → `callGrok()` function

**Steps:**
1. Get xAI API key from https://console.x.ai
2. Create backend endpoint: `POST /api/ai/grok`
3. Implement in backend:
   ```javascript
   app.post("/api/ai/grok", async (req, res) => {
     const { message, history, systemInstructions } = req.body;
     
     // Call xAI API with your secret key
     const response = await fetch("https://api.x.ai/v1/chat/completions", {
       method: "POST",
       headers: {
         "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
         "Content-Type": "application/json"
       },
       body: JSON.stringify({
         model: "grok-beta",
         messages: [
           ...(systemInstructions ? [{ role: "system", content: systemInstructions }] : []),
           ...history,
           { role: "user", content: message }
         ],
         temperature: 0.7,
         max_tokens: 2000
       })
     });

     const data = await response.json();
     res.json({ response: data.choices[0].message.content });
   });
   ```
4. Enable in `provider-adapter.js`: Set `PROVIDER_CONFIG.grok.enabled = true`
5. (Optional) Implement streaming for real-time responses

#### 2. ChatGPT (OpenAI)

**File:** `public/provider-adapter.js` → `callChatGPT()` function

**Steps:**
1. Get OpenAI API key from https://platform.openai.com/api-keys
2. Create backend endpoint: `POST /api/ai/chatgpt`
3. Implement in backend:
   ```javascript
   app.post("/api/ai/chatgpt", async (req, res) => {
     const { message, history, systemInstructions } = req.body;
     
     // Call OpenAI API with your secret key
     const response = await fetch("https://api.openai.com/v1/chat/completions", {
       method: "POST",
       headers: {
         "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
         "Content-Type": "application/json"
       },
       body: JSON.stringify({
         model: "gpt-4-turbo",  // or "gpt-4"
         messages: [
           ...(systemInstructions ? [{ role: "system", content: systemInstructions }] : []),
           ...history,
           { role: "user", content: message }
         ],
         temperature: 0.7,
         max_tokens: 2000
       })
     });

     const data = await response.json();
     res.json({ response: data.choices[0].message.content });
   });
   ```
4. Enable in `provider-adapter.js`: Set `PROVIDER_CONFIG.chatgpt.enabled = true`
5. (Optional) Implement streaming for real-time responses

### Security Checklist

- [ ] API keys stored in backend `.env` (never frontend)
- [ ] CORS configured for your frontend origin only
- [ ] Rate limiting implemented (per user, per IP)
- [ ] Input validation on all requests
- [ ] Error handling doesn't leak provider details
- [ ] Request timeout set (30-60 seconds)
- [ ] Usage tracking/logging for monitoring
- [ ] Cost alerts configured

### Testing Provider Integration

Once you've implemented a provider:

1. **Test endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/ai/chatgpt \
     -H "Content-Type: application/json" \
     -d '{
       "message": "Hello, how are you?",
       "history": [],
       "systemInstructions": ""
     }'
   ```

2. **Test in UI:**
   - Compose a message in Cyrus
   - Provider should respond (no more "Setup Pending")
   - Check browser DevTools → Network tab
   - Verify backend receives/responds correctly

3. **Monitor:**
   - Check server logs for errors
   - Track API usage in xAI/OpenAI dashboards
   - Monitor costs and token usage

## 📁 Project Structure

```
cyrus-rebuild/
├── public/                          # Frontend assets
│   ├── index.html                  # Main HTML (Cyrus UI)
│   ├── styles-cyrus.css            # Design system & styling
│   ├── cyrus-app.js                # Main application logic
│   ├── provider-adapter.js         # AI provider routing (INTEGRATE HERE)
│   ├── config.js                   # Supabase configuration
│   └── [other static files]
├── supabase/                        # Database
│   ├── migrations/                 # SQL schema migrations
│   │   ├── 20261023075646_mahi_ai_core_schema.sql
│   │   ├── 20261023083450_mahi_ai_file_attachments.sql
│   │   ├── 20261024081817_mahi_ai_memory_system.sql
│   │   ├── 20261024110000_production_hardening.sql
│   │   ├── 20261024130000_mahi_ai_usage_observability.sql
│   │   └── 20261025010000_mahi_ai_admin_control.sql
│   └── functions/                  # Supabase Edge Functions
│       └── mahi-ai-chat/          # Chat function (preserved)
├── server.js                        # Node.js web server
├── package.json                     # Dependencies
└── [deployment files]

```

### Frontend Files

| File | Purpose |
|------|---------|
| `index.html` | Cyrus UI markup - completely new design |
| `styles-cyrus.css` | Premium design system - 1000+ lines of refined CSS |
| `cyrus-app.js` | Main app logic - authentication, messages, preferences |
| `provider-adapter.js` | AI provider routing - IMPLEMENT YOUR PROVIDERS HERE |
| `config.js` | Supabase configuration |

### Backend Files (Preserved from MahiCloud)

| File | Purpose | Status |
|------|---------|--------|
| `server.js` | Node.js static/proxy server | ✅ Unchanged |
| `supabase/migrations/*.sql` | Database schema | ✅ Unchanged |
| `supabase/functions/mahi-ai-chat/` | Edge function | ✅ Unchanged |

## 🎨 Design System

### Color Palette

| Purpose | Color | CSS Variable |
|---------|-------|--------------|
| Primary accent | `#0ea5e9` (cyan) | `--color-accent` |
| Dark background | `#0a0a0a` | `--color-background` |
| Surface | `#121212` | `--color-surface-primary` |
| Text (primary) | `#ffffff` | `--color-text-primary` |
| Text (secondary) | `#b3b3b3` | `--color-text-secondary` |
| Border | `#2a2a2a` | `--color-border` |
| Success | `#10b981` | `--color-success` |
| Warning | `#f59e0b` | `--color-warning` |
| Error | `#ef4444` | `--color-error` |

### Typography

- **Font Family:** System fonts (SF Pro, Segoe UI, Roboto)
- **Monospace:** SF Mono, Monaco, Courier New
- **Base Size:** 16px
- **Scale:** 12px, 13px, 14px, 15px, 16px, 18px, 20px, 24px, 32px

### Components

- **Sidebar:** Collapsible on mobile, persistent on desktop
- **Modals:** Settings, Account with backdrop
- **Buttons:** Primary, Secondary, Danger states
- **Input:** Textarea with auto-expand, search input
- **Messages:** User (cyan), Assistant (dark surface)
- **Loading:** Pulsing dots animation

## ⚙️ Configuration

### Environment Variables

```bash
# Server
PORT=3000                    # Default: 3000
NODE_ENV=production         # Default: development

# For backend proxy (when implementing providers)
XAI_API_KEY=sk-...          # Grok API key
OPENAI_API_KEY=sk-...       # ChatGPT API key
```

### Supabase Setup

1. **Create project** at https://supabase.com
2. **Get credentials:**
   - Go to Project Settings → API Keys
   - Copy **Anon Public Key** (safe for frontend)
   - Copy **Project URL**
3. **Enable Auth:**
   - Authentication → Sign In Methods
   - Enable Anonymous (for guest access)
4. **Run migrations:**
   - SQL Editor → Paste each `.sql` file → Run
5. **Check RLS:**
   - All tables have Row Level Security enabled
   - Users can only see their own conversations

## 🧪 Testing

### Run Tests

```bash
npm test
```

Test files in `tests/` cover:
- Chat features and message handling
- Message layout and rendering
- Provider fallback logic
- Authentication and session
- Code block syntax highlighting
- And more

### Manual Testing Checklist

- [ ] Welcome screen displays with suggested prompts
- [ ] Can type and submit messages
- [ ] Messages appear in conversation
- [ ] Sidebar shows conversations
- [ ] Can search conversations
- [ ] Can create new chat
- [ ] Settings modal opens/closes
- [ ] Account modal shows user info
- [ ] Theme selector works
- [ ] Font size changes apply
- [ ] Enter-to-send preference works
- [ ] Auto-scroll preference works
- [ ] Mobile layout responsive
- [ ] Mobile sidebar drawer works
- [ ] Error messages display properly

## 🚢 Deployment

### Render (Recommended)

```bash
# Create render.yaml (already included)
# Push to GitHub
# Connect to Render
# Deploy
```

See `render.yaml` for full configuration.

### Other Platforms

The app is compatible with any Node.js hosting:
- Heroku
- Railway
- Vercel (with custom server)
- AWS (EC2, Lambda)
- DigitalOcean
- etc.

### Production Checklist

- [ ] Supabase project set to production
- [ ] API key restricted to specific origins
- [ ] Provider API keys in backend `.env` only
- [ ] CORS configured for your domain
- [ ] Rate limiting enabled
- [ ] Error logging configured
- [ ] Performance monitoring set up
- [ ] Backup strategy in place
- [ ] SSL/TLS enforced
- [ ] CSP headers configured

## 📚 API Reference

### Frontend → Backend Provider Endpoints

#### POST /api/ai/chatgpt
Send a message to ChatGPT

**Request:**
```json
{
  "message": "string",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "systemInstructions": "string"
}
```

**Response:**
```json
{
  "response": "string",
  "usage": {
    "promptTokens": 42,
    "completionTokens": 128,
    "totalTokens": 170
  }
}
```

#### POST /api/ai/grok
Send a message to Grok

**Request:** (same as ChatGPT)

**Response:** (same as ChatGPT)

## 🔒 Security

### Implemented

- ✅ Row Level Security (RLS) on all tables
- ✅ Supabase authentication with session management
- ✅ CORS headers and origin validation
- ✅ No API keys in frontend code
- ✅ Secure HTTP headers (CSP, X-Frame-Options, etc.)
- ✅ HTTPS enforced in production
- ✅ Input validation and sanitization

### Your Responsibility

- 🔑 Keep Supabase ANON key public, SERVICE key private
- 🔑 Keep provider API keys in backend `.env` only
- 🔐 Implement rate limiting on backend
- 🔐 Validate all user inputs
- 🔐 Monitor and log provider API usage
- 🔐 Set up cost alerts on provider dashboards

## 🐛 Troubleshooting

### Supabase Connection Failed

**Check:**
- `supabaseUrl` and `supabaseAnonKey` in `public/config.js`
- Network tab in DevTools for failed requests
- Supabase project is active
- CORS settings in Edge Functions

**Fix:**
```javascript
// In browser console
console.log(window.CYRUS_CONFIG);  // Verify config
fetch(window.CYRUS_CONFIG.supabaseUrl).then(r => console.log(r.status));  // Test URL
```

### Messages Not Saving

**Check:**
- Are you authenticated? (Check Account modal)
- Did migrations run? (Check Supabase Tables)
- Do RLS policies allow writes? (Check Auth)

**Fix:**
```sql
-- In Supabase SQL Editor, enable anonymous auth
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = user_id);
```

### Provider Not Responding

**Check:**
- Backend proxy endpoint accessible
- API key configured in backend `.env`
- Provider API credentials valid
- Network request shows correct status code

**Fix:**
```bash
# Test provider endpoint
curl -X POST http://localhost:3000/api/ai/chatgpt \
  -H "Content-Type: application/json" \
  -d '{"message":"test","history":[],"systemInstructions":""}'

# Check backend logs for errors
```

## 📖 Documentation

- [Cyrus UI Tour](#) - Design system and components
- [Provider Integration Guide](#) - Detailed Grok/ChatGPT setup
- [Supabase Guide](#) - Database and auth configuration
- [Deployment Guide](#) - How to deploy Cyrus

## 📝 License

Same as MahiCloud (original project)

## 🙋 Support

For issues with Cyrus:
1. Check this README
2. Check browser console for errors
3. Review `provider-adapter.js` for integration points
4. Check Supabase logs for auth/database issues
5. Test backend proxy endpoint directly

---

**Cyrus is ready to bring intelligent conversation to your users.** 🚀
