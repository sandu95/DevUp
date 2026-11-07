import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client.js"
import { DemoConfigError, loadDemoConfig } from "./config.js"
import { seedDemo } from "./seed.js"

try {
  const config = loadDemoConfig()
  const [command, ...extra] = process.argv.slice(2)
  if (extra.length || !["migrate", "seed", "serve"].includes(command ?? "")) {
    throw new DemoConfigError("Use db:deploy:demo, db:seed:demo or dev:demo without extra arguments.")
  }
  Object.assign(process.env, config, {
    NODE_ENV: "development", PORT: "3002", CORS_ORIGIN: "http://localhost:5174",
    DOTENV_CONFIG_PATH: fileURLToPath(new URL("../../.env.demo", import.meta.url)), DOTENV_CONFIG_OVERRIDE: "false",
  })
  if (command === "migrate") {
    execFileSync(process.execPath, [fileURLToPath(new URL("../../node_modules/prisma/build/index.js", import.meta.url)),
      "migrate", "deploy", "--config", "prisma7.config.ts"], {
      cwd: fileURLToPath(new URL("../../", import.meta.url)), env: process.env, stdio: "pipe",
    })
    console.log("Demo migrations deployed.")
  } else if (command === "seed") {
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.DATABASE_URL }) })
    try {
      const result = await seedDemo(prisma, config.DEMO_PASSWORD)
      console.log(result.status === "created" ? "Demo created: 3 accounts, 4 courses, 3 historical quiz attempts." : "Existing demo kept. Edits, passwords and learning progress were not changed.")
      console.log("Demo account password is configured locally in backend/.env.demo.")
    } finally { await prisma.$disconnect() }
  } else {
    await import("../server.js")
  }
} catch (error) {
  // Connection strings and passwords must never appear in command output.
  console.error(error instanceof DemoConfigError ? error.message : "Demo operation failed. Check the local .env.demo, PostgreSQL database and migrations.")
  process.exitCode = 1
}
