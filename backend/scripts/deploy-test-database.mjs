import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { parseEnv } from "node:util"
import { execFileSync } from "node:child_process"

const backendDir = fileURLToPath(new URL("../", import.meta.url))
const testEnv = parseEnv(readFileSync(new URL("../.env.test", import.meta.url), "utf8"))
if (!testEnv.DATABASE_URL || !/_test$/.test(new URL(testEnv.DATABASE_URL).pathname)) {
  throw new Error("Test migrations require .env.test with a database name ending in _test")
}
execFileSync(process.execPath, [
  fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url)),
  "migrate", "deploy", "--config", "prisma7.config.ts",
], { cwd: backendDir, env: { ...process.env, ...testEnv }, stdio: "inherit" })
