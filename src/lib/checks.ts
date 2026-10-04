/**
 * Our own uptime checks. They replaced BetterStack, whose account sits on an
 * email we can no longer open.
 *
 * A cron runs every minute (src/server.ts): each service below gets one GET,
 * the result goes to D1, and a service that fails twice in a row opens an
 * incident and sends an alert email. One success closes it again.
 *
 * Limit, stated on purpose: this runs on Cloudflare, like everything it
 * watches. A Cloudflare-wide outage takes the checker down too, and then no
 * alert goes out. An outside monitor is the only cover for that case.
 */

export interface ServiceCheck {
  id: string
  name: string
  url: string
}

export const SERVICES: ServiceCheck[] = [
  { id: "api", name: "API", url: "https://api.better-i18n.com/api/health" },
  { id: "dashboard", name: "Dashboard", url: "https://dash.better-i18n.com/" },
  { id: "cdn", name: "CDN", url: "https://cdn.better-i18n.com/better-i18n/landing/manifest.json" },
  { id: "content-api", name: "Content API", url: "https://content.better-i18n.com/health" },
  { id: "sync", name: "Sync Worker", url: "https://sync.better-i18n.com/health" },
  { id: "webhook", name: "Webhook", url: "https://webhook.better-i18n.com/health" },
  { id: "mcp", name: "MCP Server", url: "https://mcp.better-i18n.com/health" },
  { id: "website", name: "Website", url: "https://better-i18n.com/en/" },
]

/** Failures in a row before a service counts as down. One blip is not an outage. */
export const FAIL_THRESHOLD = 2
const TIMEOUT_MS = 10_000
const RAW_RETENTION_MS = 2 * 24 * 60 * 60 * 1000
const ROLLUP_RETENTION_DAYS = 90

export interface CheckResult {
  service: string
  ok: boolean
  statusCode: number | null
  latencyMs: number
  error: string | null
}

export interface ServiceState {
  state: "up" | "down"
  failStreak: number
}

export type Transition = "down" | "recovered" | null

/** Pure: the next state of one service after one check. */
export function nextState(prev: ServiceState, ok: boolean): ServiceState & { transition: Transition } {
  if (ok) {
    return { state: "up", failStreak: 0, transition: prev.state === "down" ? "recovered" : null }
  }
  const failStreak = prev.failStreak + 1
  if (prev.state === "up" && failStreak >= FAIL_THRESHOLD) {
    return { state: "down", failStreak, transition: "down" }
  }
  return { state: prev.state, failStreak, transition: null }
}

export async function checkService(service: ServiceCheck, fetcher: typeof fetch = fetch): Promise<CheckResult> {
  const started = Date.now()
  try {
    const res = await fetcher(service.url, {
      headers: { "user-agent": "better-i18n-status/1.0 (+https://status.better-i18n.com)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    // Read the body so the latency covers the whole response, not only headers.
    await res.arrayBuffer()
    return {
      service: service.id,
      ok: res.status === 200,
      statusCode: res.status,
      latencyMs: Date.now() - started,
      error: res.status === 200 ? null : `HTTP ${res.status}`,
    }
  } catch (error) {
    return {
      service: service.id,
      ok: false,
      statusCode: null,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
    }
  }
}

export interface AlertEnv {
  BREVO_API_KEY?: string
  ALERT_EMAIL?: string
  EMAIL_FROM?: string
}

async function sendAlert(env: AlertEnv, subject: string, html: string): Promise<void> {
  if (!env.BREVO_API_KEY || !env.ALERT_EMAIL) {
    // No channel configured: the log is the last place the alert can land.
    console.error(`[status] alert not sent (no BREVO_API_KEY/ALERT_EMAIL): ${subject}`)
    return
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "content-type": "application/json", "api-key": env.BREVO_API_KEY },
    body: JSON.stringify({
      sender: { email: env.EMAIL_FROM ?? "noreply@better-i18n.com", name: "Better I18N Status" },
      to: [{ email: env.ALERT_EMAIL }],
      subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) console.error(`[status] Brevo responded ${res.status} for: ${subject}`)
}

/** One cron tick: check every service, store results, open/close incidents, alert. */
export async function runChecks(db: D1Database, env: AlertEnv, now = Date.now(), fetcher: typeof fetch = fetch) {
  const results = await Promise.all(SERVICES.map((s) => checkService(s, fetcher)))
  const day = new Date(now).toISOString().slice(0, 10)

  const stateRows = await db
    .prepare("SELECT service, state, fail_streak FROM service_state")
    .all<{ service: string; state: "up" | "down"; fail_streak: number }>()
  const prevStates = new Map(stateRows.results.map((r) => [r.service, { state: r.state, failStreak: r.fail_streak }]))

  const statements: D1PreparedStatement[] = []
  const alerts: Array<{ subject: string; html: string }> = []

  for (const r of results) {
    const service = SERVICES.find((s) => s.id === r.service)!
    statements.push(
      db
        .prepare(
          "INSERT OR REPLACE INTO check_result (service, checked_at, ok, status_code, latency_ms, error) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(r.service, now, r.ok ? 1 : 0, r.statusCode, r.latencyMs, r.error),
      db
        .prepare(
          "INSERT INTO daily_rollup (service, day, checks, ok_checks) VALUES (?, ?, 1, ?) ON CONFLICT (service, day) DO UPDATE SET checks = checks + 1, ok_checks = ok_checks + excluded.ok_checks",
        )
        .bind(r.service, day, r.ok ? 1 : 0),
    )

    const next = nextState(prevStates.get(r.service) ?? { state: "up", failStreak: 0 }, r.ok)
    statements.push(
      db
        .prepare(
          "INSERT INTO service_state (service, state, fail_streak, since) VALUES (?, ?, ?, ?) ON CONFLICT (service) DO UPDATE SET state = excluded.state, fail_streak = excluded.fail_streak, since = CASE WHEN service_state.state = excluded.state THEN service_state.since ELSE excluded.since END",
        )
        .bind(r.service, next.state, next.failStreak, now),
    )

    if (next.transition === "down") {
      statements.push(
        db.prepare("INSERT INTO incident (service, started_at) VALUES (?, ?)").bind(r.service, now),
      )
      alerts.push({
        subject: `[DOWN] ${service.name} is not responding`,
        html: `<p>${service.name} failed ${next.failStreak} checks in a row.</p><p>URL: ${service.url}<br>Last result: ${r.error ?? "unknown"}</p>`,
      })
    } else if (next.transition === "recovered") {
      statements.push(
        db
          .prepare("UPDATE incident SET resolved_at = ? WHERE service = ? AND resolved_at IS NULL")
          .bind(now, r.service),
      )
      alerts.push({
        subject: `[RECOVERED] ${service.name} is back`,
        html: `<p>${service.name} answered 200 again (${r.latencyMs} ms).</p>`,
      })
    }
  }

  statements.push(
    db.prepare("DELETE FROM check_result WHERE checked_at < ?").bind(now - RAW_RETENTION_MS),
    db
      .prepare("DELETE FROM daily_rollup WHERE day < ?")
      .bind(new Date(now - ROLLUP_RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10)),
  )

  await db.batch(statements)
  await Promise.all(alerts.map((a) => sendAlert(env, a.subject, a.html)))
  return results
}
