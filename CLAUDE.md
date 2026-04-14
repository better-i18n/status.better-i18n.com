# Status Page — Claude Code Context

## What This Is

Public status page for Better i18n (`status.better-i18n.com`). Displays service health, uptime monitors, and incidents from BetterStack. Dogfoods `@better-i18n/use-intl` as a best-practice reference implementation.

## AI Assistant Guidelines

- **NEVER start dev servers** — Do not run `pnpm dev`, `vite dev`, or `wrangler dev`
- **NEVER run build commands** — User handles builds and deployments
- **Package manager:** pnpm (`pnpm install`, `pnpm run`)
- **Base branch:** `main`
- **Deploy target:** Cloudflare Workers (`wrangler deploy`)
- **Conventional commits required** — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- **Only stage files YOU changed** — use `git add <specific-files>`, NEVER `git add .`
- **Linear ticket'ları güncelle** — Commit sonrası ilgili Linear issue varsa (BETTER-xxx) `mcp__linear-server__save_issue` ile "Done" yap. Commit mesajında ticket ID referans ver.
- **Type check:** `pnpm lint` (runs `eslint`)
- **Tests:** `pnpm test` (runs `vitest run`)

## Tech Stack

- **Framework:** TanStack Start + TanStack Router
- **Hosting:** Cloudflare Workers (`@cloudflare/vite-plugin`)
- **Styling:** Tailwind CSS v4
- **React:** v19
- **i18n:** `@better-i18n/use-intl` + `@better-i18n/core`
- **Data:** BetterStack API for status/monitors/incidents

## Client-Side Locale Pattern (Key Difference from Helpcenter)

Unlike helpcenter (URL-based SSR locale routing), status uses **client-side locale detection** with no URL prefix. This is intentional — status pages don't need locale in the URL for SEO.

### Detection Priority

1. `localStorage.getItem("locale")` — previously saved user preference
2. `navigator.language.split("-")[0]` — browser language
3. SSR-detected locale from `Accept-Language` header (fallback to `"en"`)

### Persistence

```typescript
function setLocale(newLocale: string) {
  setLocaleState(newLocale)        // React state update
  localStorage.setItem("locale", newLocale)  // Persist for next visit
}
```

### SSR vs Client Flow

```
SSR:    Accept-Language header → detectLocale() → initial render
Client: useEffect → localStorage → navigator.language → override SSR locale if different
```

The `useEffect` in `__root.tsx` runs after hydration and may change the locale (causing a re-render with new translations). This is acceptable for a status page where SEO locale accuracy is less critical.

### Server-Side i18n

`src/lib/i18n.server.ts` uses:
- `getLocales({ project })` — fetches available locales from CDN manifest
- `detectLocale({ headerLocale, ... })` — `Accept-Language` only (no path/cookie detection)
- `getMessages({ project, locale })` — fetches translation bundle

## Dogfood Pattern

This app is a reference implementation for `@better-i18n/use-intl`:

```tsx
// Provider setup (src/routes/__root.tsx)
<BetterI18nProvider project={I18N_PROJECT} locale={locale}>

// In components
const t = useTranslations()
t("status.operational")

// Language picker (src/components/LocaleDropdown.tsx)
const { languages, isLoading } = useLanguages()
```

When modifying `@better-i18n/use-intl` in OSS, test changes against this app.

## Project Structure

```
status/
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts           # TanStack Start + @cloudflare/vite-plugin + Tailwind
├── wrangler.jsonc            # CF Workers: status.better-i18n.com/*
└── src/
    ├── i18n.ts              # I18N_PROJECT="better-i18n/status", default locale "en"
    ├── env.ts               # Environment validation (Zod, t3-oss/env-core)
    ├── routes/
    │   ├── __root.tsx       # Root: SSR loader, client locale detection, BetterI18nProvider
    │   └── index.tsx        # Status page (useTranslations)
    ├── components/
    │   ├── LocaleDropdown.tsx  # useLanguages() + locale context
    │   ├── Footer.tsx          # useTranslations() + LocaleDropdown + ThemeToggle
    │   ├── Header.tsx
    │   ├── StatusHeader.tsx
    │   ├── ServiceRow.tsx
    │   ├── IncidentList.tsx
    │   ├── MonitorRow.tsx
    │   ├── UptimeBar.tsx
    │   └── ThemeToggle.tsx
    └── lib/
        ├── locale-context.tsx   # React context: { locale, setLocale }
        ├── i18n.server.ts       # Server: getLocaleAndMessages() via Accept-Language
        ├── betterstack.ts       # BetterStack API types & fetching
        └── status.server.ts     # Server fn: getStatusData()
```

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current

## Debugging (CRITICAL — Log + Code methodology)

When ANY error is reported or suspected, ALWAYS read logs FIRST:
1. **Logs first** → `ol tail status` or check `.openlogs/` — find exact error, stack trace, timestamp
2. **Code second** → With log context, read the failing file/line — understand WHY it broke
3. **Fix with precision** → Logs show reality, code shows intent. The gap = the bug.

**Never debug by code-reading alone.** You'll guess at symptoms and risk false fixes. Logs pinpoint; code explains. Together = surgical fix.
