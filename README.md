# better-i18n Status

Open-source status page for [Better i18n](https://better-i18n.com) — live at **[status.better-i18n.com](https://status.better-i18n.com)**

Monitors API, CDN, Webhooks and more with real-time uptime data from Better Stack.

## Stack

- **[TanStack Start](https://tanstack.com/start)** — SSR framework (React + file-based routing)
- **[Better Stack](https://betterstack.com)** — Uptime monitoring & incident management
- **[@better-i18n/use-intl](https://better-i18n.com/docs)** — Multi-language support (EN + TR), locale detection via `Accept-Language` header
- **[Tailwind CSS v4](https://tailwindcss.com)** — Styling with dark mode support
- **[Cloudflare Workers](https://workers.cloudflare.com)** — Edge deployment

## Development

```bash
pnpm install
pnpm dev        # localhost:3000
```

Requires a `.env` file with:

```
BETTERSTACK_API_TOKEN=your_token_here
```

## Deploy

```bash
pnpm run deploy   # build + wrangler deploy → Cloudflare Workers
```

## License

MIT
