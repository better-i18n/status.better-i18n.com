export function StatusHeader() {
  return (
    <header className="w-full border-b border-[var(--border)]">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-2">
        <a
          href="https://better-i18n.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 cursor-pointer hover:opacity-75 transition-opacity"
        >
          <img
            src="https://better-i18n.com/cdn-cgi/image/width=48/logo.png"
            alt=""
            className="w-5 h-5 object-contain rounded"
          />
          <span className="text-sm font-semibold text-[var(--foreground)]">Better I18N</span>
        </a>
        <span className="text-[var(--border)] select-none">/</span>
        <span className="text-sm text-[var(--muted-foreground)]">Status</span>
      </div>
    </header>
  )
}
