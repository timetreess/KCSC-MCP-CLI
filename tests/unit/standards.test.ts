import { describe, expect, it } from "vitest";
import { KcscClient, type FetchLike } from "../../src/api/kcsc-client.js";
import { SPECIALTY_CODE_TYPES } from "../../src/api/kcsc-types.js";
import { StandardsService, toDocument, toSummary } from "../../src/core/standards.js";
import { codeListFixture, emptyViewerFixture, kdsViewerFixture } from "../fixtures/kcsc-fixtures.js";

function serviceWith(fetchFn: FetchLike): StandardsService {
  return new StandardsService(new KcscClient({ apiKey: "test-secret", fetchFn }));
}

describe("StandardsService", () => {
  it("ranks exact code matches first", async () => {
    const service = serviceWith(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => codeListFixture }));
    const results = await service.searchStandard({ query: "KDS 11 10 05" });
    expect(results[0]?.code).toBe("KDS 11 10 05");
    expect(results).toHaveLength(1);
    expect(results[0]?.reason).toContain("정확한 기준코드 일치: KDS 11 10 05");
  });

  it("ignores generic search words and ranks standard names above classification paths", async () => {
    const metadata = [
      { codeType: "KDS", code: "111001", name: "토목 일반", listParentCodes: [{ codeType: "KDS", name: "상수도 공사" }] },
      { codeType: "KCS", code: "571005", name: "상수도 공사 공통사항" },
      { codeType: "KDS", code: "111002", name: "건축 일반사항" }
    ];
    const service = serviceWith(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => metadata }));
    const results = await service.searchStandard({ query: "상수도 기준 찾아줘" });
    expect(results.map((result) => result.code)).toEqual(["KCS 57 10 05", "KDS 11 10 01"]);
    expect(results[0]?.reason).toContain("기준명 일치: 상수도");
    expect(results[1]?.reason).toContain("분류경로 일치: 상수도");
  });

  it("returns no broad result set when every query token is a stop word", async () => {
    const service = serviceWith(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => codeListFixture }));
    await expect(service.searchStandard({ query: "기준 찾아줘" })).resolves.toEqual([]);
  });

  it("returns separate KDS and KCS result sets for topic-based dual search", async () => {
    const service = serviceWith(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => codeListFixture }));
    const result = await service.searchStandardDual({ query: "공통" });
    expect(result.kdsResults[0]?.codeType).toBe("KDS");
    expect(result.kcsResults[0]?.codeType).toBe("KCS");
    expect(result.caveat).toContain("코드번호의 1:1 대응");
  });

  it("rejects a blank dual query instead of returning unrelated standards as candidates", async () => {
    const service = serviceWith(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => codeListFixture }));
    await expect(service.searchStandardDual({ query: "   " })).rejects.toThrow("Search query is required.");
  });

  it("filters specialty families", async () => {
    const service = serviceWith(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => codeListFixture }));
    const results = await service.searchStandard({ query: "포장", standardType: "specialty", specialtyType: "EXCS" });
    expect(results).toHaveLength(1);
    expect(results[0]?.specialtyType).toBe("EXCS");
  });

  it("recognizes every supported specialty code type", () => {
    const summaries = SPECIALTY_CODE_TYPES.map((codeType) => toSummary({
      codeType,
      code: "445010",
      name: `${codeType} standard`
    }));

    expect(summaries.map((summary) => summary?.specialtyType)).toEqual(SPECIALTY_CODE_TYPES);
  });

  it("gets and normalizes a standard document", async () => {
    const service = serviceWith(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => kdsViewerFixture }));
    const document = await service.getStandard("KDS 11 10 05");
    expect(document.code).toBe("KDS 11 10 05");
    expect(document.confidence).toBe("원문 직접 근거");
    expect(document.sections[1]?.text).toContain("지반설계");
    expect(document.sections[2]?.text).toContain("표준편차");
  });

  it("preserves classification paths returned with a viewer document", () => {
    const viewer = {
      ...kdsViewerFixture[0]!,
      listParentCodes: [{ codeType: "KDS", fullCode: "1011", name: "지반 설계기준" }]
    };
    const document = toDocument(viewer, "KDS", "111005");
    expect(document.parentPath).toEqual(["지반 설계기준"]);
  });

  it("reports missing evidence provenance instead of claiming direct evidence", () => {
    const incomplete = toDocument({ codeType: "KDS", code: "111005", list: [{ contents: "<p>본문만 있는 응답</p>" }] }, "KDS", "111005");
    expect(incomplete.confidence).toBe("관련 조항 추론");
    expect(incomplete.evidenceGaps).toEqual(["기준명", "개정일/update date"]);

    const complete = toDocument(kdsViewerFixture[0]!, "KDS", "111005");
    expect(complete.confidence).toBe("원문 직접 근거");
    expect(complete.evidenceGaps).toEqual([]);
  });

  it("does not add provenance gaps when a document simply has no body text", () => {
    const empty = toDocument({ codeType: "KDS", code: "111005", name: "지반 설계 일반", version: "2025", list: [] }, "KDS", "111005");
    expect(empty.confidence).toBe("근거 미확인");
    expect(empty.evidenceGaps).toEqual([]);
  });

  it("returns an actionable error for unknown documents", async () => {
    const service = serviceWith(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => emptyViewerFixture }));
    await expect(service.getStandard("KDS 99 99 99")).rejects.toThrow("KCSC returned no document");
  });
});
