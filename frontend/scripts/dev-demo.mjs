import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

execFileSync(process.execPath, [fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url)),
  "--host", "localhost", "--port", "5174", "--strictPort"], {
  env: { ...process.env, VITE_API_URL: "http://localhost:3002/api" }, stdio: "inherit",
})
