import { mkdtempSync, rmSync, rmdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { describe, expect, it } from "vitest"
import { DemoConfigError, loadDemoConfig, validateDemoConfig } from "../src/demo/config.js"

const config = {
  DATABASE_URL: "postgresql://demo:example-only@localhost:5432/devup_demo?schema=public",
  JWT_SECRET: "example-only-demo-jwt-secret-value", DEMO_PASSWORD: "example-only-demo-password",
}

describe("Demo configuration safety", () => {
  it("accepts only dedicated local demo targets", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      const values = { ...config, DATABASE_URL: config.DATABASE_URL.replace("localhost", host) }
      expect(validateDemoConfig(values).DATABASE_URL).toBe(values.DATABASE_URL)
    }
  })

  it("rejects application/test databases, remote hosts and schema/connection overrides without revealing credentials", () => {
    for (const value of [undefined, "invalid", config.DATABASE_URL.replace("devup_demo", "devup"),
      config.DATABASE_URL.replace("devup_demo", "devup_test"), config.DATABASE_URL.replace("localhost", "example.com"),
      config.DATABASE_URL.replace("schema=public", "schema=private"), config.DATABASE_URL + "&options=anything",
      config.DATABASE_URL.replace("postgresql:", "https:")]) {
      try {
        validateDemoConfig({ ...config, DATABASE_URL: value })
        expect.fail("Unsafe demo configuration accepted")
      } catch (error) {
        expect(error).toBeInstanceOf(DemoConfigError)
        expect((error as Error).message).not.toContain("example-only")
      }
    }
  })

  it("rejects production, placeholder, short or reused secrets", () => {
    expect(() => validateDemoConfig(config, "production")).toThrow(DemoConfigError)
    for (const change of [{ NODE_ENV: "production" }, { JWT_SECRET: "short" }, { DEMO_PASSWORD: "short" },
      { JWT_SECRET: config.DEMO_PASSWORD }, { DEMO_PASSWORD: "replace-with-a-demo-password" },
      { DATABASE_URL: config.DATABASE_URL.replace("demo:example-only", "YOUR_USER:YOUR_PASSWORD") }]) {
      expect(() => validateDemoConfig({ ...config, ...change })).toThrow(DemoConfigError)
    }
  })

  it("requires an explicit demo file and does not fall back to inherited app/test configuration", () => {
    const folder = mkdtempSync(join(tmpdir(), "devup-demo-config-"))
    try {
      const file = pathToFileURL(join(folder, ".env.demo"))
      expect(() => loadDemoConfig(file)).toThrow(DemoConfigError)
      writeFileSync(file, `JWT_SECRET=${config.JWT_SECRET}\nDEMO_PASSWORD=${config.DEMO_PASSWORD}\n`)
      expect(() => loadDemoConfig(file)).toThrow(DemoConfigError)
      writeFileSync(file, Object.entries(config).map(([key, value]) => `${key}=${value}`).join("\n"))
      expect(loadDemoConfig(file)).toEqual(config)
    } finally {
      rmSync(join(folder, ".env.demo"), { force: true })
      rmdirSync(folder)
    }
  })
})
