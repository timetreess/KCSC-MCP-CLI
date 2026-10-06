import { describe, expect, it } from "vitest";
import { KcscClient, type FetchLike } from "../../src/api/kcsc-client.js";
import type { CliIo } from "../../src/cli/index.js";
import { parseArgs, runCli } from "../../src/cli/index.js";
import { StandardsService } from "../../src/core/standards.js";
import { codeListFixture, emptyViewerFixture, kdsViewerFixture } from "../fixtures/kcsc-fixtures.js";

function captureIo(): { readonly io: CliIo; readonly stdout: () => string; readonly stderr: () => string } {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: { write: (chunk: string | Uint8Array) => { stdout += String(chunk); return true; } },
      stderr: { write: (chunk: string | Uint8Array) => { stderr += String(chunk); return true; } }
    },
    stdout: () => stdout,
    stderr: () => stderr
  };
}

function serviceWith(fetchFn: FetchLike): StandardsService {
  return new StandardsService(new KcscClient({ apiKey: "test-secret", fetchFn }));
}

function fixtureService(): StandardsService {
  return serviceWith(async (url) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => url.includes("CodeList") ? codeListFixture : kdsViewerFixture
  }));
}

describe("parseArgs", () => {
  it("parses commands, positional arguments, and options", () => {
    expect(parseArgs([])).toEqual({ command: "", positional: [], options: {} });
    expect(parseArgs(["search", "터널", "방수", "--project", "tunnel", "--limit", "3"])).toEqual({
      command: "search",
      positional: ["터널", "방수"],
      options: { project: "tunnel", limit: "3" }
    });
    expect(parseArgs(["verify", "--text", "KDS 11 10 05", "--flag"])).toEqual({
      command: "verify",
      positional: [],
      options: { text: "KDS 11 10 05", flag: "true" }
    });
  });
});

describe("runCli", () => {
  it("prints help without loading dependencies", async () => {
    const { io, stdout } = captureIo();
    await expect(runCli([], io, { createService: () => { throw new Error("should not load"); } })).resolves.toBe(0);
    expect(stdout()).toContain("KCSC Standards CLI");
  });

  it("runs search, get, latest, applicable, and clause commands through injected services", async () => {
    for (const args of [
      ["search", "KDS 11 10 05"],
      ["get", "KDS 11 10 05"],
      ["latest", "KDS 11 10 05"],
      ["applicable", "KDS 11 10 05", "--work", "geotechnical"],
      ["clause", "되메우기", "--code", "KDS 11 10 05"]
    ] as const) {
      const { io, stdout, stderr } = captureIo();
      await expect(runCli(args, io, { createService: fixtureService })).resolves.toBe(0);
      expect(stdout()).toContain("KDS 11 10 05");
      expect(stderr()).toBe("");
    }
  });

  it("runs verify through injected metadata fetch", async () => {
    const { io, stdout } = captureIo();
    await expect(runCli(["verify", "--text", "KDS 11 10 05"], io, { createService: fixtureService, fetchMetadata: async () => codeListFixture })).resolves.toBe(0);
    expect(stdout()).toContain("존재 여부: 확인됨");
  });

  it("returns errors for invalid CLI values and service failures", async () => {
    const invalid = captureIo();
    await expect(runCli(["search", "터널", "--project", "roads"], invalid.io, { createService: fixtureService })).resolves.toBe(1);
    expect(invalid.stderr()).toContain("Invalid project type");

    const missing = captureIo();
    await expect(runCli(["get", "KDS 99 99 99"], missing.io, { createService: () => serviceWith(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => emptyViewerFixture })) })).resolves.toBe(1);
    expect(missing.stderr()).toContain("KCSC returned no document");
  });

  it("does not print the authenticated URL from a transport failure", async () => {
    const { io, stdout, stderr } = captureIo();
    const service = serviceWith(async (url) => { throw new Error(`Cannot fetch ${url}`); });
    await expect(runCli(["search", "fixture"], io, { createService: () => service })).resolves.toBe(1);
    expect(stdout()).toBe("");
    expect(stderr()).toContain("request failed");
    expect(stderr()).not.toContain("test-secret");
  });
});
