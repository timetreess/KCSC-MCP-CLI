import { describe, expect, it } from "vitest";
import { KcscClient, KcscClientError, parseCodeListResponse, parseCodeViewerResponse, type FetchLike } from "../../src/api/kcsc-client.js";
import { toToolError } from "../../src/mcp/handlers.js";
import { codeListFixture, kdsViewerFixture } from "../fixtures/kcsc-fixtures.js";

describe("KcscClient", () => {
  it("builds URLs without exposing keys when redacted", () => {
    const client = new KcscClient({ apiKey: "test-secret" });
    expect(client.buildCodeListUrl(true)).toContain("key=REDACTED");
    expect(client.buildCodeListUrl(true)).not.toContain("test-secret");
    expect(client.buildCodeViewerUrl("KDS", "111005", true)).toContain("/CodeViewer/KDS/111005?key=REDACTED");
  });

  it("requires an API key", () => {
    expect(() => new KcscClient({ apiKey: "" })).toThrow("KCSC_API_KEY");
  });

  it("parses CodeList array responses", () => {
    const parsed = parseCodeListResponse(codeListFixture);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]?.codeType).toBe("KDS");
  });

  it("filters malformed CodeList items", () => {
    const parsed = parseCodeListResponse({ list: [null, {}, "bad", { codeType: "KDS", code: "111005", name: "지반 설계 일반" }] });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.code).toBe("111005");
    expect(parseCodeListResponse(null)).toEqual([]);
    expect(parseCodeListResponse({ list: "not-an-array" })).toEqual([]);
  });

  it("parses CodeViewer array responses", () => {
    const parsed = parseCodeViewerResponse(kdsViewerFixture);
    expect(parsed?.code).toBe("111005");
    expect(parsed?.list).toHaveLength(4);
  });

  it("filters malformed CodeViewer responses", () => {
    expect(parseCodeViewerResponse(null)).toBeNull();
    expect(parseCodeViewerResponse({ list: [null, {}, { codeType: "KDS", code: "111005", list: [] }] })?.code).toBe("111005");
    expect(parseCodeViewerResponse({ list: "not-an-array" })).toBeNull();
  });

  it("fetches CodeList using injected fetch", async () => {
    const fetchFn: FetchLike = async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => codeListFixture
    });
    const client = new KcscClient({ apiKey: "test-secret", fetchFn });
    await expect(client.fetchCodeList()).resolves.toHaveLength(3);
  });

  it("reports HTTP and JSON parsing failures without leaking keys", async () => {
    const httpClient = new KcscClient({ apiKey: "test-secret", fetchFn: async () => ({ ok: false, status: 500, statusText: "Server Error", json: async () => ({}) }) });
    await expect(httpClient.fetchCodeList()).rejects.toThrow("HTTP 500");

    const jsonClient = new KcscClient({ apiKey: "test-secret", fetchFn: async () => ({ ok: true, status: 200, statusText: "OK", json: async () => { throw new Error("bad json"); } }) });
    await expect(jsonClient.fetchCodeList()).rejects.toThrow("invalid JSON");
    expect(jsonClient.toString()).toContain("REDACTED");
    expect(jsonClient.toString()).not.toContain("test-secret");
  });

  it.each(["transport", "http", "json"])("keeps echoed credentials out of %s errors and MCP output", async (stage) => {
    const apiKey = "fixture+secret/value=";
    const fetchFn: FetchLike = async (url) => {
      const detail = `${url} echoed ${apiKey}`;
      if (stage === "transport") {
        throw new Error(detail);
      }
      return {
        ok: stage !== "http",
        status: stage === "http" ? 403 : 200,
        statusText: detail,
        json: async () => { throw new SyntaxError(detail); }
      };
    };
    const client = new KcscClient({ apiKey, fetchFn });
    const error: unknown = await client.fetchCodeList().catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(KcscClientError);
    const output = `${error instanceof Error ? error.stack : String(error)} ${JSON.stringify(toToolError(error))}`;
    expect(output).not.toContain(apiKey);
    expect(output).not.toContain(encodeURIComponent(apiKey));
    expect(output).toContain(stage === "http" ? "HTTP 403" : stage === "json" ? "invalid JSON" : "request failed");
  });
});
