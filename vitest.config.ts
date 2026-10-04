import { defineConfig } from "vitest/config"

// Unit tests run in plain Node. vite.config.ts loads the Cloudflare and
// TanStack Start plugins, which cannot start inside vitest.
export default defineConfig({
  test: { include: ["src/**/*.test.ts"], environment: "node" },
})
