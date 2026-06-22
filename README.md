# 🤖 SelectorHub - URL to Automation

Generate test cases and Playwright/Cypress automation scripts from any URL. Provide a URL and describe what you want to test - AI does the rest.

## Features

- 🔍 **Web Crawling** - Crawls the target page and extracts interactive elements via Playwright
- 🧠 **Multi-AI Support** - 7 providers, 50+ models (OpenAI, Claude, Gemini, Groq, DeepSeek, Moonshot, Qwen)
- 📋 **Test Case Table** - Structured table with scenario, input, expected result, file name, script location
- 📝 **Playwright & Cypress Scripts** - Ready-to-run `.spec.ts` / `.cy.ts` files with proper selectors
- ⬇️ **Multi-Format Export** - Download as Markdown, CSV, Playwright ZIP, or Cypress ZIP
- 🔑 **UI Key Management** - Add/validate/revoke API keys from the web interface
- 📡 **Real-time Streaming** - SSE-based progress updates during generation
- 📜 **Generation History** - SQLite-backed history with search, expand, re-run, delete
- 🔒 **Auth-Aware Crawling** - Support for Basic Auth, Bearer Token, Cookie, and Form Login
- 🎯 **Selector Playground** - Test CSS selectors live with element browser & suggestions
- 📊 **Selector Health Monitor** - Track selector stability, detect broken selectors after deploys
- ▶️ **Test Runner** - Execute generated scripts directly from the UI with pass/fail results & screenshots
- 🌙 **Dark Mode** - Toggle between light and dark themes
- ⌨️ **Keyboard Shortcuts** - Quick navigation and actions
- 🎨 **Custom Prompt Template** - Add extra AI instructions for personalized generation
- 🔄 **Auto-Retry** - Automatic retry on AI failures for resilient generation

## Architecture

```
Frontend (Next.js 14) → Backend (FastAPI) → Playwright (Crawl) → AI (Analyze) → Output
                                          → SQLite (History/Monitor)
                                          → Test Runner (Execute)
```

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- At least one AI API key (Groq and Google Gemini have free tiers)

### Backend

```bash
cd backend
pip install -r requirements.txt
playwright install chromium
python run.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000, add your API key via AI Settings, and start generating.

## Supported AI Providers

| Provider | Free Tier? | Models |
|----------|-----------|--------|
| **Groq** | ✅ Yes (30 RPM) | Llama 3.3 70B, Llama 4 Scout, GPT-OSS, Kimi K2, Qwen3, DeepSeek R1 |
| **Google Gemini** | ✅ Yes (15 RPM) | Gemini 3.1 Pro, 3 Flash, 2.5 Pro/Flash, 2.0 Flash |
| **DeepSeek** | ✅ Yes (limited) | DeepSeek V4, DeepSeek Reasoner |
| **OpenAI** | ❌ Paid | GPT-5.4, GPT-5, GPT-4.1, GPT-4o |
| **Anthropic** | ❌ Paid | Claude Opus 4.7, Sonnet 4.6, Haiku 4.5 |
| **Moonshot** | ❌ Paid | Kimi K2.6 |
| **Alibaba** | ❌ Paid | Qwen 3.6 Flash/Plus |

## Usage

1. Open http://localhost:3000
2. Click **AI Settings** (top right) → add your API key → click **Connect**
3. Enter a target URL (e.g., `https://www.saucedemo.com`)
4. Describe what to test in **Test Context**
5. (Optional) Configure authentication for protected pages
6. Click **Generate** - watch real-time progress via streaming
7. View results, run tests, copy, or download in multiple formats

## Pages

| Page | Description |
|------|-------------|
| **Generate** | Core flow: URL + context → crawl → AI → test cases + scripts |
| **History** | Browse past generations, search, expand details, re-run, delete |
| **Playground** | Load a page, browse elements, test CSS selectors, check uniqueness |
| **Monitor** | Add URLs to track, check selector health, detect broken selectors |
| **Settings** | AI providers, custom prompt, dark mode, keyboard shortcuts |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | Submit generate form |
| `Ctrl + K` | Focus URL input |
| `Ctrl + Shift + H` | Go to History |
| `Ctrl + Shift + P` | Go to Playground |
| `Ctrl + Shift + M` | Go to Monitor |
| `Escape` | Close panels/modals |

## Authentication Support

The crawler supports 4 authentication methods for protected pages:

- **Basic Auth** - HTTP Basic Authentication (username/password)
- **Bearer Token** - Authorization header with JWT or API token
- **Cookie** - Inject session cookies before crawling
- **Form Login** - Automated form submission (login URL + field selectors)

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, all endpoints
│   │   ├── models.py         # Pydantic data models (with AuthConfig)
│   │   ├── crawler.py        # Playwright crawler (auth-aware, thread executor)
│   │   ├── analyzer.py       # AI analysis (2-step with auto-retry)
│   │   ├── generator.py      # Format output (markdown table + scripts)
│   │   ├── ai_provider.py    # Multi-provider factory (7 providers)
│   │   ├── database.py       # SQLite async database (history + monitor)
│   │   └── key_store.py      # Persistent key storage
│   ├── data/                  # SQLite database (auto-created)
│   ├── run.py
│   ├── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/page.tsx      # Main page (hash routing, shortcuts, dark mode)
│   │   ├── components/
│   │   │   ├── AISettings.tsx      # Provider key management UI
│   │   │   ├── InputForm.tsx       # URL + context + auth input (SSE streaming)
│   │   │   ├── ResultsDisplay.tsx  # Tab container
│   │   │   ├── TestCaseTable.tsx   # Rendered table
│   │   │   ├── ScriptViewer.tsx    # Syntax highlighted scripts + test runner
│   │   │   ├── DownloadButtons.tsx # Multi-format download (MD, CSV, PW, Cypress)
│   │   │   └── Sidebar.tsx         # Navigation
│   │   ├── components/pages/
│   │   │   ├── GeneratePage.tsx    # Generate with streaming
│   │   │   ├── HistoryPage.tsx     # Full CRUD history
│   │   │   ├── PlaygroundPage.tsx  # Selector testing + element browser
│   │   │   ├── MonitorPage.tsx     # Selector health monitoring
│   │   │   └── SettingsPage.tsx    # Providers, prompt, dark mode, shortcuts
│   │   └── types/index.ts
│   ├── tailwind.config.ts    # Dark mode enabled
│   └── package.json
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/models` | Available AI providers and models |
| POST | `/api/generate` | Generate test cases + scripts |
| POST | `/api/generate/stream` | Generate with SSE streaming progress |
| POST | `/api/keys/validate` | Validate an API key |
| POST | `/api/keys/save` | Save an API key |
| POST | `/api/keys/revoke` | Revoke an API key |
| GET | `/api/history` | List generation history |
| GET | `/api/history/:id` | Get history detail |
| DELETE | `/api/history/:id` | Delete history record |
| DELETE | `/api/history` | Clear all history |
| GET | `/api/monitor` | List monitored URLs |
| POST | `/api/monitor` | Add URL to monitor |
| POST | `/api/monitor/:id/check` | Re-check selector health |
| DELETE | `/api/monitor/:id` | Remove monitored URL |
| POST | `/api/playground/load` | Load page + extract elements |
| POST | `/api/playground/test` | Test a CSS selector |
| POST | `/api/runner/execute` | Execute a Playwright script |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.10+, FastAPI, Playwright, aiosqlite |
| AI | OpenAI SDK, Anthropic SDK, Google GenAI SDK |
| Frontend | Next.js 14, React 18, Tailwind CSS (dark mode) |
| Database | SQLite (via aiosqlite) |
| Download | JSZip, FileSaver.js |
| UI | lucide-react, react-hot-toast, react-syntax-highlighter |
