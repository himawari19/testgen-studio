# URLtoScript

Web app: input URL + deskripsi test → crawl halaman → AI generate test case table + Playwright script.

## Stack
* **Architecture:** Single-stack Node.js/Next.js 14 application running entirely on port `3000`.
* **Database:** SQLite (`data/urltoscript.db`).
* **API Keys Store:** Stored in `.runtime_keys.json`.

## Project Structure (`src/`)
* **`app/page.tsx`:** Main page orchestrator, manages global selection state and syncs with `localStorage`.
* **`app/api/`:** All backend API endpoints:
  * `health/`: Health check.
  * `models/`: Lists models and checks provider connection status (including local 9Router ping).
  * `keys/`: Saves, validates, and revokes API keys.
  * `generate/stream/`: Coordinates crawler and prompt analyzer, streaming BDD test cases and script output using SSE.
  * `history/`: Loads and updates SQLite generation history.
  * `playground/`: Loads target pages and evaluates selectors locally.
* **`components/`:**
  * `AISettings.tsx`: Pop-up panel and settings page for keys management and provider/model configuration.
  * `InputForm.tsx`: Target URL and Test Context input form.
  * `ResultsDisplay.tsx` & `ScriptViewer.tsx`: Displays generated test cases and source code scripts.

## Rules & Restrictions (MANDATORY)

> [!WARNING]
> **No Active Dev Builds:**
> * **DO NOT** run `npm run build` during active local development.
> * Running a build conflicts with `next dev` asset caching inside the `.next/` directory, resulting in `404` errors for runtime JavaScript and CSS hot-reload chunks.
> * Run `npm run build` **ONLY** when preparing major releases or final patches.
> * **To Fix 404 Cache Errors:** Run `Remove-Item -Recurse -Force .next` inside the root directory to clear cache, then run `npm run dev` fresh.

> [!IMPORTANT]
> **No Auto-Selection:**
> * The system must **never** auto-select a default provider or model on load. The selection is stored in `localStorage` under `urltoscript_selected_provider_model`.
> * If `localStorage` is empty, keep the selection states empty (`""`) and prompt the user to configure settings.

> [!WARNING]
> **No Automated Browser Testing / Verification:**
> * **DO NOT** launch the browser or run automated browser subagents to test UI or generation flows.
> * The user will test and verify the app manually; keep the task focused on backend/frontend code implementation without running automated browser agents.

> [!NOTE]
> **9Router & Provider Ping Behavior:**
> * Supports **9Router** local AI proxy (`http://localhost:20128/v1`) without API key requirements.
> * Pings are model-specific: checking connection for *any* provider (including 9Router) sends a real validation request using the user's currently selected model (or the first available model) to verify real routing and trigger CLI logs, completely avoiding hardcoded model fallbacks.
> * Toast notifications show the total token count consumed during verification.

> [!NOTE]
> **Playground Behavior:**
> * The Selector Playground is entirely deterministic and **does NOT use AI**. 
> * It executes local Playwright evaluations and `Array.from(document.querySelectorAll(...))` to fetch element match counts.

## How to Run
```powershell
# Jalankan di root folder (port 3000)
npm run dev
```
