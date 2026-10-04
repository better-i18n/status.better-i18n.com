import type { ServiceCheck } from "./checks"
import type { AggregateState, ParsedIncident, ParsedService, ParsedStatusPage } from "./types"

export interface RollupRow {
  service: string
  day: string
  checks: number
  ok_checks: number
}
export interface StateRow {
  service: string
  state: "up" | "down"
}
export interface IncidentRow {
  id: number
  service: string
  started_at: number
  resolved_at: number | null
}

/** Same thresholds the BetterStack SLA bars used. */
export function dayStatus(availability: number): AggregateState {
  return availability >= 99 ? "operational" : availability >= 80 ? "degraded" : "downtime"
}

/** Pure: turns D1 rows into the page model. */
export function buildStatusPage(
  services: ServiceCheck[],
  rollups: RollupRow[],
  states: StateRow[],
  incidents: IncidentRow[],
  now: Date,
  days = 90,
): ParsedStatusPage {
  const parsed: ParsedService[] = services.map((s) => {
    const rows = rollups.filter((r) => r.service === s.id)
    const byDay = new Map(rows.map((r) => [r.day, r]))
    const statusHistory: ParsedService["statusHistory"] = []
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10)
      const r = byDay.get(day)
      statusHistory.push({
        day,
        status: r && r.checks > 0 ? dayStatus((r.ok_checks / r.checks) * 100) : "not_monitored",
      })
    }
    const checks = rows.reduce((n, r) => n + r.checks, 0)
    const ok = rows.reduce((n, r) => n + r.ok_checks, 0)
    const down = states.some((st) => st.service === s.id && st.state === "down")
    return {
      id: s.id,
      name: s.name,
      explanation: null,
      status: down ? "downtime" : "operational",
      availability: checks > 0 ? Math.round((ok / checks) * 10_000) / 100 : 100,
      statusHistory,
    }
  })

  const downCount = parsed.filter((s) => s.status === "downtime").length
  const aggregateState: AggregateState =
    downCount === 0 ? "operational" : downCount === parsed.length ? "downtime" : "degraded"

  const nameOf = (id: string) => services.find((s) => s.id === id)?.name ?? id
  const toIncident = (i: IncidentRow): ParsedIncident => ({
    id: String(i.id),
    title: `${nameOf(i.service)} unavailable`,
    ongoing: i.resolved_at === null,
    startsAt: new Date(i.started_at).toISOString(),
    resolvedAt: i.resolved_at === null ? null : new Date(i.resolved_at).toISOString(),
    updates: [],
  })

  return {
    companyName: "Better I18N",
    aggregateState,
    sections: [{ id: "services", name: "Services", services: parsed }],
    ongoingIncidents: incidents.filter((i) => i.resolved_at === null).map(toIncident),
    pastIncidents: incidents.filter((i) => i.resolved_at !== null).map(toIncident),
    fetchedAt: now.toISOString(),
    monitors: [],
  }
}
