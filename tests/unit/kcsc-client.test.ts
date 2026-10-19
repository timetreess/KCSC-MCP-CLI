import { describe, expect, it } from "vitest";
import { KcscClient, parseCodeListResponse, parseCodeViewerResponse, type FetchLike } from "../../src/api/kcsc-client.js";
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

  it("rejects malformed CodeList responses instead of silently dropping metadata", () => {
    for (const data of [null, { message: "Invalid API key" }, { list: "not-an-array" }, { list: [codeListFixture[0], null] }, [{ codeType: "KDS", code: "111005", name: "" }]]) {
      expect(() => parseCodeListResponse(data)).toThrow("Invalid KCSC CodeList response");
    }
    expect(parseCodeListResponse({ list: codeListFixture })).toHaveLength(3);
  });

  it("parses CodeViewer array responses", () => {
    const parsed = parseCodeViewerResponse(kdsViewerFixture);
    expect(parsed?.code).toBe("111005");
    expect(parsed?.list).toHaveLength(4);
  });

  it("rejects malformed CodeViewer responses instead of reporting a missing document", () => {
    for (const data of [null, { message: "Invalid API key" }, { list: "not-an-array" }, { list: [null, kdsViewerFixture[0]] }, [{ codeType: "KDS", code: "111005", list: [{ contents: 123 }] }]]) {
      expect(() => parseCodeViewerResponse(data)).toThrow("Invalid KCSC CodeViewer response");
    }
    expect(parseCodeViewerResponse({ list: kdsViewerFixture })?.code).toBe("111005");
  });

  it("accepts genuine empty result arrays", () => {
    for (const data of [[], { list: [] }]) {
      expect(parseCodeListResponse(data)).toEqual([]);
      expect(parseCodeViewerResponse(data)).toBeNull();
    }
  });

  it.each([["KCS", "111005"], ["KDS", "571005"]])("rejects a viewer response that does not match requested %s %s", async (type, code) => {
    const client = new KcscClient({ apiKey: "test-secret", fetchFn: async () => ({ ok: true, status: 200, statusText: "OK", json: async () => kdsViewerFixture }) });
    await expect(client.fetchCodeViewer(type, code)).rejects.toThrow("does not match the requested standard code");
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

  it("does not echo upstream HTTP or JSON error details that may contain the API key", async () => {
    for (const fetchFn of [
      async () => ({ ok: false, status: 500, statusText: "test-secret", json: async () => ({}) }),
      async (url: string) => ({ ok: true, status: 200, statusText: "OK", json: async () => { throw new Error(`Invalid JSON from ${url}`); } })
    ]) {
      const client = new KcscClient({ apiKey: "test-secret", fetchFn });
      const error = await client.fetchCodeList().catch((error: unknown) => error);
      expect(error).toBeInstanceOf(Error);
      expect(String(error)).not.toContain("test-secret");
    }
  });
});
