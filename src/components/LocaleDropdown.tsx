import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { useLanguages } from "@better-i18n/use-intl"
import { useLocaleContext } from "@/lib/locale-context"

export function LocaleDropdown() {
  const { languages, isLoading } = useLanguages()
  const { locale, setLocale } = useLocaleContext()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const current = languages.find((l) => l.code === locale)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-1.5 py-1 rounded cursor-pointer text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
      >
        <span>{current?.nativeName || locale}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden min-w-[130px] z-10">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-[var(--muted-foreground)]">Loading…</div>
          ) : (
            languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLocale(lang.code)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[var(--muted)] transition-colors text-left ${
                  lang.code === locale ? "bg-[var(--muted)] font-medium" : ""
                }`}
              >
                {lang.flagUrl ? (
                  <img src={lang.flagUrl} className="w-4 h-3 object-cover rounded-sm" alt="" />
                ) : (
                  <span className="w-4 h-3 inline-block" />
                )}
                <span>{lang.nativeName || lang.code}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
