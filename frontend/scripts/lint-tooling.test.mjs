import assert from "node:assert/strict"
import { readdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { ESLint } from "eslint"

const root = fileURLToPath(new URL("../", import.meta.url))

test("lint globs discover every source and browser-test TypeScript file", async () => {
  const expected = []
  for (const directory of ["src", "e2e"]) {
    const entries = await readdir(path.join(root, directory), { recursive: true, withFileTypes: true })
    expected.push(...entries.filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
      .map((entry) => path.resolve(entry.parentPath, entry.name)))
  }
  assert.ok(expected.length > 0)

  const results = await new ESLint({ cwd: root }).lintFiles(["src/**/*.{ts,tsx}", "e2e/**/*.ts"])
  assert.deepEqual(results.map((result) => result.filePath).sort(), expected.sort())
})

test("lint keeps build/dependency files ignored and source files included", async () => {
  const eslint = new ESLint({ cwd: root })
  for (const file of ["dist/assets/page.js", "node_modules/package/index.ts"]) {
    assert.equal(await eslint.isPathIgnored(path.join(root, file)), true, file)
  }
  for (const file of ["src/App.tsx", "e2e/devup.spec.ts"]) {
    assert.equal(await eslint.isPathIgnored(path.join(root, file)), false, file)
  }
})

test("the matched TypeScript/JSX config parses valid code and still reports rule violations", async () => {
  const eslint = new ESLint({ cwd: root })
  const options = { filePath: path.join(root, "src/lint-tooling-fixture.tsx") }
  const valid = 'export default function Example() { return <div>OK</div> }'
  const [accepted] = await eslint.lintText(valid, options)
  assert.equal(accepted.errorCount, 0)
  assert.equal(accepted.warningCount, 0)

  const [rejected] = await eslint.lintText('const unused: number = 1;\n' + valid, options)
  assert.equal(rejected.fatalErrorCount, 0)
  assert.ok(rejected.messages.some((message) => message.ruleId === "@typescript-eslint/no-unused-vars"))
})
