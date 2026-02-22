import { useState } from "react"
import { ChevronDown, CheckCircle2, AlertTriangle, XCircle, Wrench } from "lucide-react"
import { useTranslations, useFormatter } from "@better-i18n/use-intl"
import { UptimeBar } from "./UptimeBar"
import type { ParsedService, AggregateState } from "@/lib/betterstack"

const STATUS_COLORS: Record<AggregateState, string> = {
  operational: "var(--status-operational)",
  degraded: "var(--status-degraded)",
  downtime: "var(--status-downtime)",
  maintenance: "var(--status-maintenance)",
}

const STATUS_ICONS: Record<AggregateState, React.ReactNode> = {
  operational: <CheckCircle2 className="w-4 h-4" />,
  degraded: <AlertTriangle className="w-4 h-4" />,
  downtime: <XCircle className="w-4 h-4" />,
  maintenance: <Wrench className="w-4 h-4" />,
}

export function ServiceCard({ service, defaultOpen = false }: { service: ParsedService; defaultOpen?: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen)
  const t = useTranslations()
  const format = useFormatter()
  const color = STATUS_COLORS[service.status]
  const icon = STATUS_ICONS[service.status]

  const monitoredDays = service.statusHistory
    .filter((d) => d.status !== "not_monitored")
    .slice()
    .reverse()

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--muted)]/40 transition-colors text-left cursor-pointer"
      >
        <span className="font-semibold text-[var(--foreground)]">{service.name}</span>
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)]/60 bg-[var(--muted)]/60 pl-2 pr-1.5 py-1 shrink-0 ml-3">
          <span style={{ color }}>{icon}</span>
          <span className="text-xs font-medium text-[var(--foreground)]">
            {t(`service.${service.status}`)}
          </span>
          <ChevronDown
            className={`w-3 h-3 text-[var(--muted-foreground)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <div className={`grid transition-all duration-200 ease-in-out ${expanded ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-[var(--border)] px-5 py-5">
            <div className="flex justify-end mb-2">
              <span className="text-sm font-semibold" style={{ color }}>
                {service.availability.toFixed(3)}{t("uptime.percent")}
              </span>
            </div>

            <UptimeBar history={service.statusHistory} />

            <div className="flex justify-between mt-2">
              <span className="text-xs text-[var(--muted-foreground)]">{t("uptime.days_ago")}</span>
              <span className="text-xs text-[var(--muted-foreground)]">{t("uptime.today")}</span>
            </div>

            {service.explanation && (
              <p className="mt-3 text-xs text-[var(--muted-foreground)] italic">{service.explanation}</p>
            )}

            {monitoredDays.length > 0 && (
              <div className="mt-4 border-t border-[var(--border)] pt-3 max-h-48 overflow-y-auto space-y-0.5">
                {monitoredDays.map((d) => {
                  const dayColor = STATUS_COLORS[d.status as AggregateState] ?? "var(--muted-foreground)"
                  return (
                    <div key={d.day} className="flex items-center justify-between py-1 text-sm">
                      <span className="text-[var(--muted-foreground)]">{format.dateTime(new Date(d.day + "T00:00:00"), { month: "short", day: "2-digit", year: "numeric" })}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dayColor }} />
                        <span className="font-medium" style={{ color: dayColor }}>
                          {t(`service.${d.status}`)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
