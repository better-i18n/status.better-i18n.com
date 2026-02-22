import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import { getLocales, getMessages } from "@better-i18n/use-intl/server"
import { detectLocale } from "@better-i18n/core"
import { I18N_PROJECT, I18N_DEFAULT_LOCALE } from "@/i18n"

export const getLocaleAndMessages = createServerFn({ method: "GET" }).handler(async () => {
  const acceptLang = getRequestHeader("accept-language") ?? ""
  const headerLocale = acceptLang.split(",")[0]?.split(";")[0]?.split("-")[0]?.trim() ?? null

  const availableLocales = await getLocales({ project: I18N_PROJECT })

  const { locale } = detectLocale({
    pathLocale: null,
    cookieLocale: null,
    headerLocale,
    defaultLocale: I18N_DEFAULT_LOCALE,
    availableLocales,
    project: I18N_PROJECT,
  })

  const messages = await getMessages({ project: I18N_PROJECT, locale })

  return { locale, messages, availableLocales }
})
