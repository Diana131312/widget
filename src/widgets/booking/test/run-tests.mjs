import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.."
);

for (const key of [
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "http_proxy",
  "https_proxy",
  "ALL_PROXY",
  "all_proxy",
  "NODE_USE_ENV_PROXY",
  "GLOBAL_AGENT_HTTP_PROXY",
  "GLOBAL_AGENT_HTTPS_PROXY",
]) {
  delete process.env[key];
}
process.env.NO_PROXY = "*";
process.env.no_proxy = "*";

const require = createRequire(path.join(root, "package.json"));
const vitest = require.resolve("vitest/vitest.mjs");
const child = spawn(
  process.execPath,
  [vitest, "run", ...process.argv.slice(2)],
  { cwd: root, stdio: "inherit", env: process.env }
);

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
