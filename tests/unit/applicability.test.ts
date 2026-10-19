import { describe, expect, it } from "vitest";
import { KcscClient, type FetchLike } from "../../src/api/kcsc-client.js";
import { ApplicabilityChecker } from "../../src/core/applicability.js";
import { StandardsService } from "../../src/core/standards.js";
import { kdsViewerFixture } from "../fixtures/kcsc-fixtures.js";

function checkerWithViewer(): ApplicabilityChecker {
  const fetchFn: FetchLike = async () => ({ ok: true, status: 200, statusText: "OK", json: async () => kdsViewerFixture });
  return new ApplicabilityChecker(new StandardsService(new KcscClient({ apiKey: "test-secret", fetchFn })));
}

function checkerWithText(text: string, sectionLabel = "본문"): ApplicabilityChecker {
  const viewer = [{ codeType: "KDS", code: "111005", name: "지반 설계 일반", version: "2025", list: [{ sort: 1, title: "일반사항", label: sectionLabel, contents: `<p>${text}</p>` }] }];
  const fetchFn: FetchLike = async () => ({ ok: true, status: 200, statusText: "OK", json: async () => viewer });
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

  it("does not match a single-syllable project keyword inside an unrelated word", async () => {
    const result = await checkerWithText("일반사항을 따른다.").check({ standardCode: "KDS111005", projectType: "port" });
    expect(result.projectMatched).toBe(false);
    expect(result.matchedProjects).not.toContain("port");
  });

  it("still matches multi-syllable project keywords", async () => {
    const result = await checkerWithText("방파제 및 부두 기준을 적용한다.").check({ standardCode: "KDS111005", projectType: "port" });
    expect(result.projectMatched).toBe(true);
    expect(result.matchedProjects).toContain("port");
  });

  it("reports the matched keyword and its location", async () => {
    const result = await checkerWithText("방파제 설치에 따른다.", "2.1 일반사항").check({ standardCode: "KDS111005", projectType: "port" });
    expect(result.evidence.map((item) => item.keyword)).toContain("방파제");
    const evidence = result.evidence.find((item) => item.keyword === "방파제");
    expect(evidence?.category).toBe("port");
    expect(evidence?.location).toBe("sectionText");
    expect(evidence?.sectionLabel).toBe("2.1 일반사항");
    expect(result.reasoning.join(" ")).toContain("방파제");
  });
});
