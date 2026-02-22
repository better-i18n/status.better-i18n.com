import { useTranslations } from "@better-i18n/use-intl"
import { LocaleDropdown } from "./LocaleDropdown"
import { ThemeToggle } from "./ThemeToggle"

export function Footer() {
  const t = useTranslations()

  return (
    <footer className="py-6 mt-8">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
          <a
            href="https://betterstack.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 cursor-pointer hover:text-[var(--foreground)] transition-colors"
          >
            {t("footer.monitoring")}
            <span className="font-medium text-[var(--foreground)]">BetterStack</span>
          </a>
          <span>·</span>
          <a
            href="https://better-i18n.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 cursor-pointer hover:text-[var(--foreground)] transition-colors"
          >
            {t("footer.localization")}
            <img
              src="https://better-i18n.com/cdn-cgi/image/width=32/logo.png"
              className="w-3.5 h-3.5"
              alt=""
            />
            <span className="font-medium text-[var(--foreground)]">Better I18N</span>
          </a>
        </div>
        <div className="flex items-center gap-1.5">
          <LocaleDropdown />
          <ThemeToggle />
        </div>
      </div>
    </footer>
  )
}
