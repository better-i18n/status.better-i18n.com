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

// JSON:API types from BetterStack
interface JsonApiResource {
  id: string
  type: string
  attributes: Record<string, unknown>
  relationships?: Record<string, { data: { id: string; type: string } | Array<{ id: string; type: string }> }>
}

interface BetterStackApiResponse {
  data: {
    id: string
    type: string
    attributes: {
      company_name: string
      aggregate_state: AggregateState
      [key: string]: unknown
    }
    relationships: {
      sections: { data: Array<{ id: string; type: string }> }
      resources: { data: Array<{ id: string; type: string }> }
      status_reports: { data: Array<{ id: string; type: string }> }
    }
  }
  included: JsonApiResource[]
}

const SERVICE_ORDER = ["API", "Dashboard", "CDN", "Sync Worker", "Webhook", "MCP Server"]

function sortServices(services: ParsedService[]): ParsedService[] {
  return [...services].sort((a, b) => {
    const aIdx = SERVICE_ORDER.indexOf(a.name)
    const bIdx = SERVICE_ORDER.indexOf(b.name)
    if (aIdx === -1 && bIdx === -1) return a.name.localeCompare(b.name)
    if (aIdx === -1) return 1
    if (bIdx === -1) return -1
    return aIdx - bIdx
  })
}

function padStatusHistory(
  history: Array<{ day: string; status: string }> = [],
  days = 90,
): Array<{ day: string; status: AggregateState | "not_monitored" }> {
  const now = new Date()
  const historyMap = new Map(history.map((h) => [h.day, h.status]))
  const result: Array<{ day: string; status: AggregateState | "not_monitored" }> = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const day = d.toISOString().split("T")[0]
    const status = historyMap.get(day)
    result.push({ day, status: (status as AggregateState) || "not_monitored" })
  }

  return result
}

export async function fetchBetterStackStatus(baseUrl: string): Promise<ParsedStatusPage> {
  const url = `${baseUrl.replace(/\/$/, "")}/index.json`
  const res = await fetch(url, { headers: { Accept: "application/json" } })

  if (!res.ok) {
    throw new Error(`BetterStack API error: ${res.status} ${res.statusText}`)
  }

  const data: BetterStackApiResponse = await res.json()
  const attrs = data.data.attributes
  const included = data.included || []

  // Build lookup map for included resources
  const includedMap = new Map<string, JsonApiResource>()
  for (const item of included) {
    includedMap.set(`${item.type}:${item.id}`, item)
  }

  // Parse resources (status_page_resource items in included)
  const resourcesById = new Map<string, ParsedService>()
  for (const item of included) {
    if (item.type !== "status_page_resource") continue
    const a = item.attributes
    resourcesById.set(item.id, {
      id: item.id,
      name: (a.public_name as string) || (a.name as string) || "Unknown",
      explanation: (a.explanation as string | null) ?? null,
      status: (a.status as AggregateState) || "operational",
      availability: typeof a.availability === "number" ? a.availability : 100,
      statusHistory: padStatusHistory(a.status_history as Array<{ day: string; status: string }>),
    })
  }

  // Parse sections and assign resources
  const sectionRefs = data.data.relationships.sections?.data || []
  const resourceRefs = data.data.relationships.resources?.data || []

  // Build section → resources mapping (resources belong to sections via their relationships)
  const sectionResourceMap = new Map<string, string[]>()
  for (const ref of resourceRefs) {
    const resource = includedMap.get(`status_page_resource:${ref.id}`)
    if (!resource) continue
    const sectionRel = resource.relationships?.status_page_section?.data
    const sectionId = sectionRel && !Array.isArray(sectionRel) ? sectionRel.id : null
    if (sectionId) {
      if (!sectionResourceMap.has(sectionId)) sectionResourceMap.set(sectionId, [])
      sectionResourceMap.get(sectionId)!.push(ref.id)
    }
  }

  // If no section relationships found, assign all resources to first section
  if (sectionResourceMap.size === 0 && resourceRefs.length > 0 && sectionRefs.length > 0) {
    sectionResourceMap.set(sectionRefs[0].id, resourceRefs.map((r) => r.id))
  }

  const sections: ParsedSection[] = sectionRefs.map((ref) => {
    const sectionItem = includedMap.get(`status_page_section:${ref.id}`)
    const resourceIds = sectionResourceMap.get(ref.id) || []
    const services = resourceIds
      .map((id) => resourcesById.get(id))
      .filter(Boolean) as ParsedService[]

    return {
      id: ref.id,
      name: (sectionItem?.attributes.name as string) || "Services",
      services: sortServices(services),
    }
  })

  // Parse status reports (incidents)
  const reportRefs = data.data.relationships.status_reports?.data || []
  const now30 = new Date()
  now30.setDate(now30.getDate() - 30)

  const ongoingIncidents: ParsedIncident[] = []
  const pastIncidents: ParsedIncident[] = []

  for (const ref of reportRefs) {
    const report = includedMap.get(`status_page_report:${ref.id}`)
    if (!report) continue
    const a = report.attributes
    const startsAt = (a.created_at as string) || new Date().toISOString()

    // Skip reports older than 30 days
    if (!a.ongoing && a.resolved_at && new Date(a.resolved_at as string) < now30) continue

    // Parse updates from report relationships
    const updateRefs = Array.isArray(report.relationships?.status_updates?.data)
      ? (report.relationships!.status_updates!.data as Array<{ id: string; type: string }>)
      : []

    const updates = updateRefs
      .map((uRef) => {
        const u = includedMap.get(`status_update:${uRef.id}`)
        if (!u) return null
        return {
          id: u.id,
          message: (u.attributes.message as string) || "",
          publishedAt: (u.attributes.created_at as string) || startsAt,
        }
      })
      .filter(Boolean) as ParsedIncident["updates"]

    const incident: ParsedIncident = {
      id: report.id,
      title: (a.title as string) || "Incident",
      ongoing: Boolean(a.ongoing),
      startsAt,
      resolvedAt: (a.resolved_at as string | null) ?? null,
      updates,
    }

    if (incident.ongoing) {
      ongoingIncidents.push(incident)
    } else {
      pastIncidents.push(incident)
    }
  }

  return {
    companyName: attrs.company_name,
    aggregateState: attrs.aggregate_state,
    sections,
    ongoingIncidents,
    pastIncidents,
    fetchedAt: new Date().toISOString(),
    monitors: [],
  }
}

interface MonitorHistoryResult {
  statusHistory: Array<{ day: string; status: AggregateState | "not_monitored" }>
  availability: number | null
}

async function fetchMonitorHistory(token: string, monitorId: string): Promise<MonitorHistoryResult> {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 89) // 90 days total

  const fromStr = from.toISOString().split("T")[0]
  const toStr = to.toISOString().split("T")[0]

  try {
    const res = await fetch(
      `https://uptime.betterstack.com/api/v2/monitors/${monitorId}/sla-reports?from=${fromStr}&to=${toStr}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
    )
    if (!res.ok) return { statusHistory: padStatusHistory([]), availability: null }

    const data = await res.json()
    const reports: Array<{ attributes: { availability: number; created_at: string } }> = (
      data.data ?? []
    ).sort(
      (
        a: { attributes: { created_at: string } },
        b: { attributes: { created_at: string } },
      ) => a.attributes.created_at.localeCompare(b.attributes.created_at),
    )

    if (!reports.length) return { statusHistory: padStatusHistory([]), availability: null }

    const latestAvailability = reports[reports.length - 1].attributes.availability
    const rawHistory = reports.map((r) => {
      const avail = r.attributes.availability
      const status: AggregateState =
        avail >= 99 ? "operational" : avail >= 80 ? "degraded" : "downtime"
      return { day: r.attributes.created_at.split("T")[0], status }
    })

    return { statusHistory: padStatusHistory(rawHistory), availability: latestAvailability }
  } catch {
    return { statusHistory: padStatusHistory([]), availability: null }
  }
}

export async function fetchBetterStackMonitors(token: string): Promise<ParsedMonitor[]> {
  const res = await fetch("https://uptime.betterstack.com/api/v2/monitors", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })
  if (!res.ok) return []
  const data = await res.json()
  const monitors: Array<{ id: string; attributes: Record<string, unknown> }> = data.data ?? []

  const histories = await Promise.all(monitors.map((m) => fetchMonitorHistory(token, m.id)))

  return monitors.map((m, i) => ({
    id: m.id,
    name: (m.attributes.pronounceable_name as string) || (m.attributes.url as string),
    url: m.attributes.url as string,
    status: m.attributes.status as ParsedMonitor["status"],
    lastCheckedAt: (m.attributes.last_checked_at as string | null) ?? null,
    availability: histories[i].availability,
    statusHistory: histories[i].statusHistory,
  }))
}
