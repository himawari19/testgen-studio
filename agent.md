# TestGen Studio - Agent Notes

Next.js 14 app for URL crawling, AI test-case generation, scripts, history, selector playground, and monitor.

## Current Stack
- App: single Next.js app in `src/`, runs on port `3000`.
- DB: Neon PostgreSQL only, via `src/app/api/db.ts` and `DATABASE_URL`.
- No SQLite runtime. `data/` is old local DB residue.
- Keys/config: user input and browser `localStorage`; do not hardcode provider URLs/keys.
- 9Router: local `http://localhost:20128/v1`, public URL saved in browser as `9router_public`.

## Files To Check First
- Landing: `src/app/page.tsx`
- App shell: `src/app/app/page.tsx`
- AI settings: `src/components/AISettings.tsx`
- Generate form: `src/components/InputForm.tsx`
- DB/schema: `src/app/api/db.ts`, `schema.sql`
- Models/status: `src/app/api/models/route.ts`
- Key validation: `src/app/api/keys/validate/route.ts`
- Generation: `src/app/api/generate/stream/route.ts`
- History: `src/app/api/history/route.ts`
- Neon keepalive: `.github/workflows/neon-ping.yml`

## Rules
- Do not push unless user explicitly says push.
- Avoid `npm run build` during local dev; it can conflict with `.next` dev cache.
- Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.
- Fast check: `npx.cmd tsc --noEmit --incremental false`.
- Do not launch browser automation unless user asks.
- Do not auto-select provider/model when empty; user choice lives in `urltoscript_selected_provider_model`.
- Neon ping is via GitHub Actions only, not Vercel Cron.

## Cleanup Notes
- `README.md` still has old backend/SQLite docs.
- `sqlite` dependency is legacy unless a current grep proves otherwise.
