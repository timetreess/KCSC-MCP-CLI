import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, redactSecret } from "../../src/config.js";

describe("config", () => {
  it("loads KCSC_API_KEY from provided env", () => {
    expect(loadConfig({ KCSC_API_KEY: "abc123" }).kcscApiKey).toBe("abc123");
  });

  it("normalizes supported legacy API key names", () => {
    expect(loadConfig({ SERVICE_KEY: "legacy123" }).kcscApiKey).toBe("legacy123");
  });

  it("loads legacy key aliases from an explicitly selected env file", () => {
    const directory = mkdtempSync(join(tmpdir(), "kcsc-config-"));
    const envFile = join(directory, "kcsc.env");
    writeFileSync(envFile, "SERVICE_KEY=legacy-from-file\n", "utf8");

    try {
      expect(loadConfig({ KCSC_ENV_FILE: envFile }).kcscApiKey).toBe("legacy-from-file");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("does not read a caller project's .env when KCSC_ENV_FILE is explicit", () => {
    const directory = mkdtempSync(join(tmpdir(), "kcsc-config-cwd-"));
    const envFile = join(directory, "kcsc.env");
    const callerEnvFile = join(directory, ".env");
    const originalDirectory = process.cwd();
    const keyNames = ["KCSC_API_KEY", "KCSC_OPENAPI_KEY", "KCSC_SERVICE_KEY", "SERVICE_KEY", "KCSC_ENV_FILE"] as const;
    const originalValues = new Map(keyNames.map((key) => [key, process.env[key]]));
    writeFileSync(envFile, "", "utf8");
    writeFileSync(callerEnvFile, "SERVICE_KEY=unrelated-project-key\n", "utf8");

    try {
      for (const key of keyNames) {
        delete process.env[key];
      }
      process.env.KCSC_ENV_FILE = envFile;
      process.chdir(directory);
      expect(() => loadConfig()).toThrow("KCSC_API_KEY");
    } finally {
      process.chdir(originalDirectory);
      for (const key of keyNames) {
        const value = originalValues.get(key);
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("prioritizes canonical and legacy API keys in order", () => {
    expect(loadConfig({ KCSC_API_KEY: " canonical ", KCSC_OPENAPI_KEY: "openapi", KCSC_SERVICE_KEY: "service", SERVICE_KEY: "legacy" }).kcscApiKey).toBe("canonical");
    expect(loadConfig({ KCSC_OPENAPI_KEY: "openapi", KCSC_SERVICE_KEY: "service", SERVICE_KEY: "legacy" }).kcscApiKey).toBe("openapi");
    expect(loadConfig({ KCSC_SERVICE_KEY: "service", SERVICE_KEY: "legacy" }).kcscApiKey).toBe("service");
  });

  it("throws actionable missing key error", () => {
    expect(() => loadConfig({})).toThrow("KCSC_API_KEY");
  });

  it("redacts secrets", () => {
    expect(redactSecret("abcdef12")).toBe("ab****12");
  });
});
