import { createContext, useContext } from "react"

interface LocaleContextValue {
  locale: string
  setLocale: (locale: string) => void
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
})

export function useLocaleContext() {
  return useContext(LocaleContext)
}

export const LocaleContextProvider = LocaleContext.Provider
