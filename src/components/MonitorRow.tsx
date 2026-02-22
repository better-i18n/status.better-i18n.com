import { useState } from "react"
import { ChevronDown, CheckCircle2, XCircle, AlertCircle, Wrench, PauseCircle, Clock } from "lucide-react"
import { useTranslations, useFormatter } from "@better-i18n/use-intl"
import type { ParsedMonitor } from "@/lib/betterstack"
import { UptimeBar } from "./UptimeBar"

const STATUS_CONFIG: Record<
  ParsedMonitor["status"],
  { color: string; labelKey: string; icon: React.ReactNode }
> = {
  up: {
    color: "var(--status-operational)",
    labelKey: "service.operational",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  down: {
    color: "var(--status-downtime)",
    labelKey: "service.downtime",
    icon: <XCircle className="w-4 h-4" />,
  },
  validating: {
    color: "var(--status-degraded)",
    labelKey: "service.recovering",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  maintenance: {
    color: "var(--status-maintenance)",
    labelKey: "service.maintenance",
    icon: <Wrench className="w-4 h-4" />,
  },
  paused: {
    color: "var(--status-not-monitored)",
    labelKey: "service.paused",
    icon: <PauseCircle className="w-4 h-4" />,
  },
  pending: {
    color: "var(--status-not-monitored)",
    labelKey: "service.pending",
    icon: <Clock className="w-4 h-4" />,
  },
}

export function MonitorRow({ monitor }: { monitor: ParsedMonitor }) {
  const [expanded, setExpanded] = useState(false)
  const t = useTranslations()
  const format = useFormatter()
  const cfg = STATUS_CONFIG[monitor.status] ?? STATUS_CONFIG.pending

  const ago = monitor.lastCheckedAt
    ? format.relativeTime(new Date(monitor.lastCheckedAt))
    : ""

  const absoluteTime = monitor.lastCheckedAt
    ? format.dateTime(new Date(monitor.lastCheckedAt), {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  const hasHistory = monitor.statusHistory?.length > 0

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--muted)]/40 transition-colors text-left cursor-pointer"
      >
        <span className="font-medium text-[var(--foreground)] truncate min-w-0 mr-3">
          {monitor.name}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {ago && (
            <span className="text-xs text-[var(--muted-foreground)] hidden sm:inline">{ago}</span>
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)]/60 bg-[var(--muted)]/60 pl-2 pr-1.5 py-1">
            <span style={{ color: cfg.color }}>{cfg.icon}</span>
            <span className="text-xs font-medium text-[var(--foreground)]">{t(cfg.labelKey)}</span>
            <ChevronDown
              className={`w-3 h-3 text-[var(--muted-foreground)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      </button>

      <div className={`grid transition-all duration-200 ease-in-out ${expanded ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-[var(--border)] px-5 py-5">
            {hasHistory && (
              <>
                {monitor.availability !== null && (
                  <div className="flex justify-end mb-2">
                    <span className="text-sm font-semibold" style={{ color: cfg.color }}>
                      {monitor.availability.toFixed(3)}{t("uptime.percent")}
                    </span>
                  </div>
                )}
                <UptimeBar history={monitor.statusHistory} />
                <div className="flex justify-between mt-2 mb-4">
                  <span className="text-xs text-[var(--muted-foreground)]">{t("uptime.days_ago")}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">{t("uptime.today")}</span>
                </div>
              </>
            )}
            {absoluteTime && (
              <p className="text-xs text-[var(--muted-foreground)]">
                {t("monitor.last_checked")}: {absoluteTime}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
