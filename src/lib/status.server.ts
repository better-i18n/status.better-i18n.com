import { createServerFn } from "@tanstack/react-start"
import { fetchBetterStackStatus, fetchBetterStackMonitors, type ParsedStatusPage } from "./betterstack"

const BETTERSTACK_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_BETTERSTACK_URL
    ? import.meta.env.VITE_BETTERSTACK_URL
    : "https://better-i18n.betteruptime.com"

const BETTERSTACK_API_TOKEN = process.env.BETTERSTACK_API_TOKEN

export const getStatusData = createServerFn({ method: "GET" }).handler(
  async (): Promise<ParsedStatusPage> => {
    const [statusPage, monitors] = await Promise.all([
      fetchBetterStackStatus(BETTERSTACK_URL),
      BETTERSTACK_API_TOKEN
        ? fetchBetterStackMonitors(BETTERSTACK_API_TOKEN)
        : Promise.resolve([]),
    ])
    return { ...statusPage, monitors }
  },
)
