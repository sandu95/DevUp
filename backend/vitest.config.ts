import { defineConfig } from "vitest/config"
import dotenv from "dotenv"

const testEnv = dotenv.config({
  path: ".env.test",
  override: true,
  quiet: true,
})

// API tests create and delete fixtures. Never fall back to the app database.
const testDatabaseUrl = testEnv.parsed?.DATABASE_URL
if (testEnv.error || !testDatabaseUrl ||
    !/_test$/.test(new URL(testDatabaseUrl).pathname)) {
  throw new Error("Tests require .env.test with a DATABASE_URL ending in _test")
}

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
  },
})
