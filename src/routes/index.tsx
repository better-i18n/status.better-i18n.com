import { createFileRoute } from "@tanstack/react-router"
import { getStatusData } from "@/lib/status.server"
import { StatusHeader } from "@/components/StatusHeader"
import { ServiceCard } from "@/components/ServiceRow"
import { IncidentList } from "@/components/IncidentList"
import { Footer } from "@/components/Footer"
import { useTranslations } from "@better-i18n/use-intl"
import { MonitorRow } from "@/components/MonitorRow"
import { Check, AlertTriangle, X, Wrench } from "lucide-react"
import type { AggregateState } from "@/lib/betterstack"

export const Route = createFileRoute("/")({
  loader: () => getStatusData(),
  component: StatusPage,
})

const BANNER_CONFIG: Record<
  AggregateState,
  { bgVar: string; borderVar: string }
> = {
  operational: {
    bgVar: "var(--status-operational-bg)",
    borderVar: "var(--status-operational-border)",
  },
  degraded: {
    bgVar: "var(--status-degraded-bg)",
    borderVar: "var(--status-degraded-border)",
  },
  downtime: {
    bgVar: "var(--status-downtime-bg)",
    borderVar: "var(--status-downtime-border)",
  },
  maintenance: {
    bgVar: "var(--status-maintenance-bg)",
    borderVar: "var(--status-maintenance-border)",
  },
}

const HERO_ICONS: Record<AggregateState, React.ReactNode> = {
  operational: <Check className="w-6 h-6" strokeWidth={2.5} />,
  degraded: <AlertTriangle className="w-6 h-6" strokeWidth={2.5} />,
  downtime: <X className="w-6 h-6" strokeWidth={2.5} />,
  maintenance: <Wrench className="w-6 h-6" strokeWidth={2.5} />,
}

const HERO_ICON_COLORS: Record<AggregateState, string> = {
  operational: "var(--status-operational)",
  degraded: "var(--status-degraded)",
  downtime: "var(--status-downtime)",
  maintenance: "var(--status-maintenance)",
}

function StatusPage() {
  const data = Route.useLoaderData()
  const t = useTranslations()
  const banner = BANNER_CONFIG[data.aggregateState]
  const hasIncidents = data.ongoingIncidents.length > 0 || data.pastIncidents.length > 0

  const formattedTime = new Date(data.fetchedAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })

  const allServices = data.sections.flatMap((s) => s.services)

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <StatusHeader />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="text-center py-10">
          <div
            className="mx-auto mb-5 w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: banner.bgVar,
              border: `1px solid ${banner.borderVar}`,
              color: HERO_ICON_COLORS[data.aggregateState],
            }}
          >
            {HERO_ICONS[data.aggregateState]}
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1.5">
            {t(`status.${data.aggregateState}`)}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("updated.at")} {formattedTime}
          </p>
        </div>

        {/* Service Cards */}
        {allServices.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden shadow-sm">
            {allServices.map((service, index) => (
              <ServiceCard key={service.id} service={service} defaultOpen={index === 0} />
            ))}
          </div>
        )}

        {/* Live Endpoints — R2 excluded */}
        {(() => {
          const visible = data.monitors.filter(
            (m) => !m.name.toLowerCase().includes("r2") && !m.url.toLowerCase().includes(".r2."),
          )
          return visible.length > 0 ? (
            <section>
              <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden shadow-sm">
                {visible.map((monitor) => (
                  <MonitorRow key={monitor.id} monitor={monitor} />
                ))}
              </div>
            </section>
          ) : null
        })()}

        {hasIncidents && (
          <IncidentList
            ongoingIncidents={data.ongoingIncidents}
            pastIncidents={data.pastIncidents}
          />
        )}
      </main>

      <Footer />
    </div>
  )
}
