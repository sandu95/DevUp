import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"

export class DemoConfigError extends Error {}

export function validateDemoConfig(values: Record<string, string | undefined>, nodeEnv = process.env.NODE_ENV) {
  if (nodeEnv === "production" || values.NODE_ENV === "production") {
    throw new DemoConfigError("Demo commands are disabled in production.")
  }
  let url: URL
  try { url = new URL(values.DATABASE_URL ?? "") }
  catch { throw new DemoConfigError("Set a valid demo DATABASE_URL in backend/.env.demo.") }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/^\/[a-z][a-z0-9_]*_demo$/.test(url.pathname) ||
    [...url.searchParams].some(([key, value]) => key !== "schema" || value !== "public") ||
    url.username.includes("YOUR_") || url.password.includes("YOUR_")) {
    throw new DemoConfigError("Demo commands require local PostgreSQL, a database ending in _demo and the public schema.")
  }
  const jwtSecret = values.JWT_SECRET ?? ""
  const password = values.DEMO_PASSWORD ?? ""
  if (jwtSecret.length < 24 || password.length < 12 ||
    [jwtSecret, password].some((value) => value.startsWith("replace-")) || jwtSecret === password) {
    throw new DemoConfigError("Set a separate JWT_SECRET (24+ characters) and DEMO_PASSWORD (12+ characters) in .env.demo.")
  }
  return { DATABASE_URL: url.href, JWT_SECRET: jwtSecret, DEMO_PASSWORD: password }
}

export function loadDemoConfig(file = new URL("../../.env.demo", import.meta.url)) {
  let values: Record<string, string | undefined>
  try { values = parseEnv(readFileSync(file, "utf8")) }
  catch { throw new DemoConfigError("Create backend/.env.demo from .env.demo.example before running demo commands.") }
  // Never fall back to an inherited DATABASE_URL or to the application .env.
  return validateDemoConfig(values)
}
