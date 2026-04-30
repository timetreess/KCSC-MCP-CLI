import { describe, expect, it } from "vitest";
import { loadConfig, redactSecret } from "../../src/config.js";

describe("config", () => {
  it("loads KCSC_API_KEY from provided env", () => {
    expect(loadConfig({ KCSC_API_KEY: "abc123" }).kcscApiKey).toBe("abc123");
  });

  it("normalizes supported legacy API key names", () => {
    expect(loadConfig({ SERVICE_KEY: "legacy123" }).kcscApiKey).toBe("legacy123");
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
