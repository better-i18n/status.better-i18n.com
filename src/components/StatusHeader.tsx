export function StatusHeader() {
  return (
    <header className="w-full">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-center gap-2">
        <a
          href="https://better-i18n.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 cursor-pointer hover:opacity-75 transition-opacity"
        >
          <img
            src="/brand/logo.svg"
            alt=""
            className="w-5 h-5 object-contain dark:hidden"
          />
          <img
            src="/brand/logo-dark.svg"
            alt=""
            className="w-5 h-5 object-contain hidden dark:block"
          />
          <span className="text-sm font-semibold text-[var(--foreground)]">Better I18N</span>
          <span className="text-[var(--border)] select-none">/</span>
          <span className="text-sm text-[var(--muted-foreground)]">Status</span>
        </a>
      </div>
    </header>
  )
}
