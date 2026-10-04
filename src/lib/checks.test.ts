import { describe, expect, it, vi } from "vitest"
import { FAIL_THRESHOLD, checkService, nextState } from "./checks"
import { buildStatusPage, dayStatus } from "./status-page"

describe("nextState", () => {
  it("needs FAIL_THRESHOLD failures in a row before a service is down", () => {
    let s = { state: "up" as const, failStreak: 0 }
    const transitions = []
    for (let i = 0; i < FAIL_THRESHOLD; i++) {
      const n = nextState(s, false)
      transitions.push(n.transition)
      s = { state: n.state as "up", failStreak: n.failStreak }
    }
    expect(transitions).toEqual([...Array(FAIL_THRESHOLD - 1).fill(null), "down"])
  })

  it("recovers on one success and only then reports it", () => {
    expect(nextState({ state: "down", failStreak: 5 }, true)).toEqual({ state: "up", failStreak: 0, transition: "recovered" })
    expect(nextState({ state: "up", failStreak: 1 }, true).transition).toBeNull()
  })

  it("does not re-alert while already down", () => {
    expect(nextState({ state: "down", failStreak: 3 }, false).transition).toBeNull()
  })
})

describe("checkService", () => {
  const svc = { id: "api", name: "API", url: "https://example.test/health" }

  it("treats only HTTP 200 as up", async () => {
    const ok = await checkService(svc, vi.fn(async () => new Response("ok", { status: 200 })) as typeof fetch)
    const bad = await checkService(svc, vi.fn(async () => new Response("no", { status: 503 })) as typeof fetch)
    expect([ok.ok, bad.ok, bad.error]).toEqual([true, false, "HTTP 503"])
  })

  it("records a network error as a failure instead of throwing", async () => {
    const r = await checkService(svc, vi.fn(async () => { throw new Error("timeout") }) as typeof fetch)
    expect(r).toMatchObject({ ok: false, statusCode: null, error: "timeout" })
  })
})

describe("buildStatusPage", () => {
  const services = [
    { id: "api", name: "API", url: "" },
    { id: "cdn", name: "CDN", url: "" },
  ]
  const now = new Date("2026-10-04T12:00:00Z")

  it("marks days without data as not monitored and colours days by availability", () => {
    const page = buildStatusPage(services, [{ service: "api", day: "2026-10-04", checks: 100, ok_checks: 90 }], [], [], now, 3)
    expect(page.sections[0].services[0].statusHistory.map((d) => d.status)).toEqual(["not_monitored", "not_monitored", "degraded"])
    expect(page.sections[0].services[0].availability).toBe(90)
  })

  it("is degraded when some services are down and downtime when all are", () => {
    expect(buildStatusPage(services, [], [{ service: "api", state: "down" }], [], now).aggregateState).toBe("degraded")
    expect(
      buildStatusPage(services, [], [{ service: "api", state: "down" }, { service: "cdn", state: "down" }], [], now).aggregateState,
    ).toBe("downtime")
  })

  it("splits open and resolved incidents", () => {
    const page = buildStatusPage(
      services,
      [],
      [],
      [
        { id: 1, service: "cdn", started_at: now.getTime(), resolved_at: null },
        { id: 2, service: "api", started_at: now.getTime() - 1000, resolved_at: now.getTime() },
      ],
      now,
    )
    expect(page.ongoingIncidents.map((i) => i.title)).toEqual(["CDN unavailable"])
    expect(page.pastIncidents.map((i) => i.ongoing)).toEqual([false])
  })

  it("uses the same day thresholds as before", () => {
    expect([dayStatus(99.5), dayStatus(85), dayStatus(10)]).toEqual(["operational", "degraded", "downtime"])
  })
})
