#!/usr/bin/env node
/**
 * Verifies the published artifact instead of the working tree: packs the package, installs it into
 * a throwaway directory, then runs the real `kcsc` CLI and the real `kcsc-mcp` stdio server.
 *
 * No KCSC API key is required and no request is sent: the CLI runs with `--help` and the server is
 * only asked to list tools, so this is safe to run in CI on every pull request.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const workDir = mkdtempSync(join(tmpdir(), "kcsc-package-verify-"));
const consumerDir = join(workDir, "consumer");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const failures = [];

function run(command, args, options) {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
  } catch (error) {
    const stderr = typeof error.stderr === "string" ? error.stderr.trim().split("\n").slice(-3).join(" ") : "";
    throw new Error(`${error instanceof Error ? error.message : String(error)}${stderr ? ` | ${stderr}` : ""}`);
  }
}

/**
 * Spawns npm through its JavaScript entry point when available. Recent Node versions refuse to
 * spawn `npm.cmd` directly, so the shell shim is not a reliable cross-platform target.
 */
function runNpm(args, options) {
  const npmCli = process.env.npm_execpath;
  if (npmCli) {
    return run(process.execPath, [npmCli, ...args], options);
  }
  return run(npmCommand, args, { shell: process.platform === "win32", ...options });
}

async function step(name, run) {
  try {
    const detail = await run();
    process.stdout.write(`  ok   ${name}${detail ? ` (${detail})` : ""}\n`);
  } catch (error) {
    failures.push(name);
    process.stdout.write(`  FAIL ${name}: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

let tarballName;

await step("npm pack", () => {
  const output = runNpm(["pack", "--pack-destination", workDir, "--json"], { cwd: repoRoot });
  tarballName = JSON.parse(output)[0].filename;
  return tarballName;
});

await step("npm install into a clean directory", () => {
  mkdirSync(consumerDir, { recursive: true });
  runNpm(["init", "--yes"], { cwd: consumerDir });
  runNpm(["install", join(workDir, tarballName ?? ""), "--no-audit", "--no-fund", "--loglevel", "error"], { cwd: consumerDir });
  return "installed without workspace state";
});

const installedRoot = join(consumerDir, "node_modules", "kcsc-standards-mcp");

await step("package ships only intended files", () => {
  const entries = readdirSync(installedRoot).sort();
  const unexpected = entries.filter((entry) => ![".env.example", "LICENSE", "README.md", "dist", "package.json"].includes(entry));
  if (unexpected.length > 0) {
    throw new Error(`unexpected top-level entries: ${unexpected.join(", ")}`);
  }
  return entries.join(", ");
});

await step("kcsc CLI runs from the installed package", () => {
  const help = run(process.execPath, [join(installedRoot, "dist", "src", "cli", "index.js"), "--help"]);
  if (!help.includes("KCSC Standards CLI")) {
    throw new Error("help text was not printed");
  }
  return "kcsc --help";
});

await step("kcsc-mcp stdio server completes an MCP handshake", async () => {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(installedRoot, "dist", "src", "mcp", "server.js")],
    env: { ...process.env, KCSC_API_KEY: process.env.KCSC_API_KEY ?? "package-verify-dummy-key" },
    stderr: "ignore"
  });
  const client = new Client({ name: "kcsc-package-verify", version: "1.0.0" });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    if (tools.length !== 7) {
      throw new Error(`expected 7 tools, received ${tools.length}`);
    }
    const loose = tools.filter((tool) => tool.outputSchema?.additionalProperties !== false).map((tool) => tool.name);
    if (loose.length > 0) {
      throw new Error(`tools without a strict output schema: ${loose.join(", ")}`);
    }
    const missingInput = tools.filter((tool) => tool.inputSchema === undefined).map((tool) => tool.name);
    if (missingInput.length > 0) {
      throw new Error(`tools without an input schema: ${missingInput.join(", ")}`);
    }
    return `${tools.length} tools, all with strict output schemas`;
  } finally {
    await client.close();
  }
});

rmSync(workDir, { recursive: true, force: true });

process.stdout.write(`artifact: ${tarballName ?? "(not produced)"}\n`);
if (failures.length > 0) {
  process.stdout.write(`\n${failures.length} package verification step(s) failed\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("\npackage verification passed\n");
}