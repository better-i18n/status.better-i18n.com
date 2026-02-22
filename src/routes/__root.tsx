import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { useState, useEffect } from "react"

import TanStackQueryProvider from "../integrations/tanstack-query/root-provider"
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools"
import { BetterI18nProvider, useLanguages } from "@better-i18n/use-intl"
import { LocaleContextProvider } from "@/lib/locale-context"
import { I18N_PROJECT } from "@/i18n"
import { getLocaleAndMessages } from "@/lib/i18n.server"

import appCss from "../styles.css?url"

import type { QueryClient } from "@tanstack/react-query"

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  loader: async () => getLocaleAndMessages(),

  head: ({ loaderData }) => {
    const messages = loaderData?.messages ?? {}
    const title = (messages as Record<string, string>)["meta.status.title"] ?? "Better I18N Status"
    const description = (messages as Record<string, string>)["meta.status.description"] ?? ""

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://status.better-i18n.com" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "canonical", href: "https://status.better-i18n.com" },
      ],
    }
  },

  shellComponent: RootDocument,
})

function LocaleGuard({ locale, setLocale }: { locale: string; setLocale: (l: string) => void }) {
  const { languages, isLoading } = useLanguages()
  useEffect(() => {
    if (!isLoading && languages.length > 0) {
      const valid = languages.some((l) => l.code === locale)
      if (!valid) setLocale("en")
    }
  }, [languages, isLoading, locale, setLocale])
  return null
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { availableLocales } = Route.useLoaderData()
  const [locale, setLocaleState] = useState<string>("en")

  useEffect(() => {
    const saved = localStorage.getItem("locale")
    if (saved && availableLocales.includes(saved)) {
      setLocaleState(saved)
      return
    }
    const browserLang = navigator.language?.split("-")[0]
    if (browserLang && availableLocales.includes(browserLang)) {
      setLocaleState(browserLang)
    }
  }, [availableLocales])

  function setLocale(newLocale: string) {
    setLocaleState(newLocale)
    localStorage.setItem("locale", newLocale)
  }

  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        <TanStackQueryProvider>
          <LocaleContextProvider value={{ locale, setLocale }}>
            <BetterI18nProvider project={I18N_PROJECT} locale={locale}>
              <LocaleGuard locale={locale} setLocale={setLocale} />
              {children}
              <TanStackDevtools
                config={{ position: "bottom-right" }}
                plugins={[
                  { name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> },
                  TanStackQueryDevtools,
                ]}
              />
            </BetterI18nProvider>
          </LocaleContextProvider>
        </TanStackQueryProvider>
        <Scripts />
      </body>
    </html>
  )
}
