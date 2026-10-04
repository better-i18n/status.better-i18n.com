/** Shapes the status page renders. Filled by src/lib/status.server.ts from our own checks. */

export type AggregateState = "operational" | "degraded" | "downtime" | "maintenance"

export interface ParsedService {
  id: string
  name: string
  explanation: string | null
  status: AggregateState
  availability: number
  statusHistory: Array<{ day: string; status: AggregateState | "not_monitored" }>
}

export interface ParsedSection {
  id: string
  name: string
  services: ParsedService[]
}

export interface ParsedIncident {
  id: string
  title: string
  ongoing: boolean
  startsAt: string
  resolvedAt: string | null
  updates: Array<{ id: string; message: string; publishedAt: string }>
}

export interface ParsedMonitor {
  id: string
  name: string
  url: string
  status: "up" | "down" | "validating" | "paused" | "pending" | "maintenance"
  lastCheckedAt: string | null
  availability: number | null
  statusHistory: Array<{ day: string; status: AggregateState | "not_monitored" }>
}

export interface ParsedStatusPage {
  companyName: string
  aggregateState: AggregateState
  sections: ParsedSection[]
  ongoingIncidents: ParsedIncident[]
  pastIncidents: ParsedIncident[]
  fetchedAt: string
  monitors: ParsedMonitor[]
}
