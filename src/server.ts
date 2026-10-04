/**
 * Worker entry: the TanStack Start handler for pages, plus a cron that runs
 * our uptime checks every minute (src/lib/checks.ts). Same shape as
 * TanStack/tanstack.com src/server.ts.
 */
import handler from "@tanstack/react-start/server-entry"
import { runChecks, type AlertEnv } from "./lib/checks"

interface Env extends AlertEnv {
  DB: D1Database
  MIGRATION_PROXY_SECRET?: string
}

/**
 * TEMPORARY: Cloudflare account migration. Remove once better-i18n.com is an
 * active zone in "Better i18n Org". The old account's proxy forwards requests
 * here with the real host in signed headers; restore it so SSR sees
 * status.better-i18n.com instead of the workers.dev host.
 */
function unwrapMigrationProxy(request: Request, env: Env): Request {
  const secret = env.MIGRATION_PROXY_SECRET
  if (!secret || request.headers.get("x-bi18n-proxy-auth") !== secret) return request
  const headers = new Headers(request.headers)
  const ip = headers.get("x-bi18n-client-ip")
  const country = headers.get("x-bi18n-client-country")
  const host = headers.get("x-bi18n-original-host")
  if (ip) {
    headers.set("cf-connecting-ip", ip)
    headers.set("x-forwarded-for", ip)
  }
  if (country) headers.set("cf-ipcountry", country)
  for (const name of ["x-bi18n-proxy-auth", "x-bi18n-client-ip", "x-bi18n-client-country", "x-bi18n-original-host"]) {
    headers.delete(name)
  }
  const url = new URL(request.url)
  if (host) url.host = host
  return new Request(url.toString(), new Request(request, { headers }))
}

export default {
  fetch(request: Request, env: Env) {
    return handler.fetch(unwrapMigrationProxy(request, env))
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runChecks(env.DB, env, controller.scheduledTime))
  },
}
