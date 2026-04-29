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

  it("parses CodeViewer array responses", () => {
    const parsed = parseCodeViewerResponse(kdsViewerFixture);
    expect(parsed?.code).toBe("111005");
    expect(parsed?.list).toHaveLength(3);
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
});
