import { createServerFn } from "@tanstack/react-start"
import { env } from "cloudflare:workers"
import { SERVICES } from "./checks"
import { buildStatusPage, type IncidentRow, type RollupRow, type StateRow } from "./status-page"
import type { ParsedStatusPage } from "./types"

/** Reads the results of our own checks (src/lib/checks.ts) from D1. */
export const getStatusData = createServerFn({ method: "GET" }).handler(
  async (): Promise<ParsedStatusPage> => {
    const db = (env as { DB: D1Database }).DB
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
    const [rollups, states, incidents] = await db.batch([
      db.prepare("SELECT service, day, checks, ok_checks FROM daily_rollup WHERE day >= ?").bind(since),
      db.prepare("SELECT service, state FROM service_state"),
      db
        .prepare(
          "SELECT id, service, started_at, resolved_at FROM incident WHERE resolved_at IS NULL OR resolved_at > ? ORDER BY started_at DESC LIMIT 50",
        )
        .bind(Date.now() - 30 * 86_400_000),
    ])
    return buildStatusPage(
      SERVICES,
      rollups.results as RollupRow[],
      states.results as StateRow[],
      incidents.results as IncidentRow[],
      new Date(),
    )
  },
)
