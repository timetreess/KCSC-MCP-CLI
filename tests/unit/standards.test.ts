import { describe, expect, it } from "vitest";
import { KcscClient, type FetchLike } from "../../src/api/kcsc-client.js";
import { StandardsService } from "../../src/core/standards.js";
import { codeListFixture, emptyViewerFixture, kdsViewerFixture } from "../fixtures/kcsc-fixtures.js";

function serviceWith(fetchFn: FetchLike): StandardsService {
  return new StandardsService(new KcscClient({ apiKey: "test-secret", fetchFn }));
}

describe("StandardsService", () => {
  it("ranks exact code matches first", async () => {
    const service = serviceWith(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => codeListFixture }));
    const results = await service.searchStandard({ query: "KDS 11 10 05" });
    expect(results[0]?.code).toBe("KDS 11 10 05");
  });

  it("filters specialty families", async () => {
    const service = serviceWith(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => codeListFixture }));
    const results = await service.searchStandard({ query: "포장", standardType: "specialty", specialtyType: "EXCS" });
    expect(results).toHaveLength(1);
    expect(results[0]?.specialtyType).toBe("EXCS");
  });

  it("gets and normalizes a standard document", async () => {
    const service = serviceWith(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => kdsViewerFixture }));
    const document = await service.getStandard("KDS 11 10 05");
    expect(document.code).toBe("KDS 11 10 05");
    expect(document.confidence).toBe("원문 직접 근거");
    expect(document.sections[1]?.text).toContain("지반설계");
    expect(document.sections[2]?.text).toContain("표준편차");
  });

  it("returns an actionable error for unknown documents", async () => {
    const service = serviceWith(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => emptyViewerFixture }));
    await expect(service.getStandard("KDS 99 99 99")).rejects.toThrow("KCSC returned no document");
  });
});
