import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@better-i18n/ui/components/tooltip"
import type { AggregateState } from "@/lib/betterstack"

interface UptimeBarProps {
  history: Array<{ day: string; status: AggregateState | "not_monitored" }>
}

const STATUS_COLORS: Record<AggregateState | "not_monitored", string> = {
  operational: "var(--status-operational)",
  degraded: "var(--status-degraded)",
  downtime: "var(--status-downtime)",
  maintenance: "var(--status-maintenance)",
  not_monitored: "var(--status-not-monitored)",
}

const STATUS_LABELS: Record<AggregateState | "not_monitored", string> = {
  operational: "Operational",
  degraded: "Degraded",
  downtime: "Outage",
  maintenance: "Maintenance",
  not_monitored: "No data",
}

function formatDay(day: string) {
  return new Date(day + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  })
}

export function UptimeBar({ history }: UptimeBarProps) {
  if (!history.length) return null

  return (
    <TooltipProvider delayDuration={80}>
      <div className="flex h-10 gap-[2px] overflow-x-auto">
        {history.map((entry) => (
          <Tooltip key={entry.day}>
            <TooltipTrigger asChild>
              <div
                className="flex-1 min-w-[3px] rounded-[2px] cursor-pointer transition-opacity hover:opacity-75"
                style={{ backgroundColor: STATUS_COLORS[entry.status] }}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="p-0 overflow-hidden min-w-[130px]">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[entry.status] }}
                />
                <span className="font-semibold text-sm">{STATUS_LABELS[entry.status]}</span>
              </div>
              <div className="border-t border-[var(--border)] px-3 py-2">
                <span className="text-xs text-[var(--muted-foreground)]">{formatDay(entry.day)}</span>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
