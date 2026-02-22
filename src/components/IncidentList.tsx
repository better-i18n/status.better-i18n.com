import { useState } from "react"
import { useTranslations } from "@better-i18n/use-intl"
import { ChevronDown, ChevronUp, AlertCircle, AlertTriangle } from "lucide-react"
import type { ParsedIncident } from "@/lib/betterstack"

interface IncidentItemProps {
  incident: ParsedIncident
  defaultOpen?: boolean
}

function IncidentItem({ incident, defaultOpen = false }: IncidentItemProps) {
  const [open, setOpen] = useState(defaultOpen)

  const startsAt = new Date(incident.startsAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--card)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--muted)] transition-colors"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-[var(--status-downtime)] mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm text-[var(--foreground)]">{incident.title}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{startsAt}</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
        )}
      </button>

      {open && incident.updates.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-3 space-y-3">
          {incident.updates.map((update) => {
            const time = new Date(update.publishedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
            return (
              <div key={update.id} className="flex gap-3 text-sm">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-[var(--muted-foreground)] mt-1.5 shrink-0" />
                  <div className="flex-1 w-px bg-[var(--border)] mt-1" />
                </div>
                <div className="pb-2">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">{time}</p>
                  <p className="text-[var(--foreground)] text-sm leading-relaxed">{update.message}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface IncidentListProps {
  ongoingIncidents: ParsedIncident[]
  pastIncidents: ParsedIncident[]
}

export function IncidentList({ ongoingIncidents, pastIncidents }: IncidentListProps) {
  const t = useTranslations()
  const [pastOpen, setPastOpen] = useState(false)

  if (ongoingIncidents.length === 0 && pastIncidents.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {ongoingIncidents.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-[var(--status-downtime)]" />
            <h2 className="font-semibold text-[var(--foreground)]">{t("incidents.active")}</h2>
          </div>
          <div className="space-y-2">
            {ongoingIncidents.map((inc) => (
              <IncidentItem key={inc.id} incident={inc} defaultOpen />
            ))}
          </div>
        </section>
      )}

      {pastIncidents.length > 0 && (
        <section>
          <button
            onClick={() => setPastOpen(!pastOpen)}
            className="flex items-center gap-2 mb-3 group w-full"
          >
            <h2 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--muted-foreground)] transition-colors">
              {t("incidents.past")}
            </h2>
            {pastOpen ? (
              <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
            )}
          </button>
          {pastOpen && (
            <div className="space-y-2">
              {pastIncidents.map((inc) => (
                <IncidentItem key={inc.id} incident={inc} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
