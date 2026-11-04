import { defineConfig, devices } from "@playwright/test"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { parseEnv } from "node:util"

const backendDir = fileURLToPath(new URL("../backend/", import.meta.url))
const testEnv = parseEnv(readFileSync(new URL("../backend/.env.test", import.meta.url), "utf8"))
if (!testEnv.DATABASE_URL || !/_test$/.test(new URL(testEnv.DATABASE_URL).pathname)) {
  throw new Error("Browser tests require backend/.env.test with a database name ending in _test")
}
Object.assign(process.env, testEnv, { JWT_SECRET: "browser-test-secret" })
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? "msedge"
if (browserChannel !== "msedge" && browserChannel !== "chromium") {
  throw new Error("PLAYWRIGHT_BROWSER_CHANNEL must be msedge or chromium")
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5180",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: browserChannel === "msedge" ? "edge" : "chromium", use: {
    ...devices[browserChannel === "msedge" ? "Desktop Edge" : "Desktop Chrome"], channel: browserChannel,
  } }],
  webServer: [
    {
      command: "npm run dev",
      cwd: backendDir,
      env: { PORT: "3001", CORS_ORIGIN: "http://localhost:5180" },
      url: "http://localhost:3001/api",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --host localhost --port 5180 --strictPort",
      env: { VITE_API_URL: "http://localhost:3001/api" },
      url: "http://localhost:5180",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
})
