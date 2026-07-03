import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

function loadEnvFile(fileName) {
  const filePath = resolve(root, fileName);
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const { default: handler } = await import("../api/[...path].js");

const apiServer = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost:8080");
    if (!url.pathname.startsWith("/api/")) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "API server only. Open http://localhost:5173 for the app." }));
      return;
    }

    const pathParts = url.pathname
      .replace(/^\/api\/?/, "")
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);

    req.query = Object.fromEntries(url.searchParams.entries());
    req.query.path = pathParts;
    await handler(req, res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Local API server error" }));
    console.error(error);
  }
});

apiServer.listen(8080, () => {
  console.log("Local API ready at http://localhost:8080");
});

const viteBin = resolve(root, "node_modules", "vite", "bin", "vite.js");
const vite = spawn(process.execPath, [viteBin, "--host", "0.0.0.0", "--port", "5173"], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});

function shutdown() {
  apiServer.close();
  vite.kill();
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

vite.on("exit", (code) => {
  apiServer.close();
  process.exit(code ?? 0);
});
