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

  it("does not infer waterworks or foundation from incidental body substrings", async () => {
    const result = await checkerWithText("감독자가 지정한 색상에 상수 k를 곱할 수도 있다.")
      .check({ standardCode: "KDS111005", projectType: "waterworks", workType: "foundation" });
    expect(result.projectMatched).toBe(false);
    expect(result.workMatched).toBe(false);
    expect(result.evidence.some((item) => item.category === "waterworks" || item.category === "foundation")).toBe(false);
  });

  it("requires repeated body evidence or multiple distinct terms", async () => {
    const single = await checkerWithText("방파제를 설치한다.").check({ standardCode: "KDS111005", projectType: "port" });
    expect(single.projectMatched).toBe(false);

    const repeated = await checkerWithText("방파제 설치 전 방파제 안정성을 확인한다.")
      .check({ standardCode: "KDS111005", projectType: "port" });
    expect(repeated.projectMatched).toBe(true);
  });

  it("uses classification paths when the viewer response provides them", async () => {
    const viewer = [{
      codeType: "KDS",
      code: "111005",
      name: "시설 설계 일반",
      version: "2025",
      listParentCodes: [{ codeType: "KDS", fullCode: "1011", name: "상수도 공사" }],
      list: [{ sort: 1, title: "적용 범위", label: "1.1", contents: "<p>이 기준을 적용한다.</p>" }]
    }];
    const fetchFn: FetchLike = async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => viewer
    });
    const checker = new ApplicabilityChecker(new StandardsService(new KcscClient({ apiKey: "test-secret", fetchFn })));
    const result = await checker.check({ standardCode: "KDS111005", projectType: "waterworks" });
    expect(result.projectMatched).toBe(true);
    expect(result.evidence).toContainEqual(expect.objectContaining({ keyword: "상수도", location: "parentPath" }));
  });

  it("validates an optional specialty family against the requested code", async () => {
    await expect(checkerWithViewer().check({ standardCode: "KDS111005", specialtyType: "EXCS" }))
      .rejects.toThrow("does not match KDS");
  });

  it("reports the matched keyword and its location", async () => {
    const result = await checkerWithText("방파제와 부두 설치에 따른다.", "2.1 일반사항").check({ standardCode: "KDS111005", projectType: "port" });
    expect(result.evidence.map((item) => item.keyword)).toContain("방파제");
    const evidence = result.evidence.find((item) => item.keyword === "방파제");
    expect(evidence?.category).toBe("port");
    expect(evidence?.location).toBe("sectionText");
    expect(evidence?.sectionLabel).toBe("2.1 일반사항");
    expect(result.reasoning.join(" ")).toContain("방파제");
  });
});
