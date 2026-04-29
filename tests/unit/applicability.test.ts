import { describe, expect, it } from "vitest";
import { KcscClient, type FetchLike } from "../../src/api/kcsc-client.js";
import { ApplicabilityChecker } from "../../src/core/applicability.js";
import { StandardsService } from "../../src/core/standards.js";
import { kdsViewerFixture } from "../fixtures/kcsc-fixtures.js";

function checkerWithViewer(): ApplicabilityChecker {
  const fetchFn: FetchLike = async () => ({ ok: true, status: 200, statusText: "OK", json: async () => kdsViewerFixture });
  return new ApplicabilityChecker(new StandardsService(new KcscClient({ apiKey: "test-secret", fetchFn })));
}

describe("ApplicabilityChecker", () => {
  it("returns advisory applicability with contract caveats", async () => {
    const result = await checkerWithViewer().check({ standardCode: "KDS 11 10 05", workType: "geotechnical" });
    expect(result.standard.code).toBe("KDS 11 10 05");
    expect(result.workMatched).toBe(true);
    expect(result.confidence).toBe("관련 조항 추론");
    expect(result.caveat).toContain("계약문서");
    expect(result.caveat).toContain("최종 공학적 판단을 대체하지 않습니다");
  });

  it("does not claim applicability when requested context does not match", async () => {
    const result = await checkerWithViewer().check({ standardCode: "KDS 11 10 05", projectType: "port" });
    expect(result.projectMatched).toBe(false);
    expect(result.confidence).toBe("근거 미확인");
    expect(result.recommendation).toContain("직접 대응되는 적용성 근거를 확인하지 못했습니다");
  });
});
