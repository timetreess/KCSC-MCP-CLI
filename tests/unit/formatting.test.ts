import { describe, expect, it } from "vitest";
import { decodeHtmlEntities, normalizeHtml } from "../../src/core/formatting.js";

describe("normalizeHtml", () => {
  it("strips paragraph tags while preserving Korean text", () => {
    expect(normalizeHtml("<p>되메우기 다짐 기준</p>")).toBe("되메우기 다짐 기준");
  });

  it("preserves line boundaries and units", () => {
    expect(normalizeHtml("<p>다짐도 95% 이상</p><p>두께 300 mm 이하</p>")).toBe("다짐도 95% 이상\n두께 300 mm 이하");
  });

  it("keeps table cell boundaries visible", () => {
    expect(normalizeHtml("<table><tr><td>항목</td><td>기준값</td></tr></table>")).toContain("항목 | 기준값");
  });

  it("keeps table row boundaries visible", () => {
    expect(normalizeHtml("<table><tr><td>항목</td><td>기준값</td></tr><tr><td>다짐도</td><td>95%</td></tr></table>")).toBe("항목 | 기준값 |\n다짐도 | 95% |");
  });

  it("decodes formula entities used in standards", () => {
    expect(normalizeHtml("<p>평균치&plusmn;표준편차</p>")).toBe("평균치±표준편차");
  });

  it("decodes numeric and common publishing entities safely", () => {
    expect(decodeHtmlEntities("&#60;KDS&#x7B;11&#x7D;")).toBe("<KDS{11}");
    expect(decodeHtmlEntities("A&mdash;B&ndash;C&hellip;&copy;&reg;&trade;")).toBe("A—B–C…©®™");
    expect(decodeHtmlEntities("&#99999999;&unknown;")).toBe("&#99999999;&unknown;");
  });

  it("removes script content", () => {
    expect(normalizeHtml("<script>alert(1)</script><p>본문</p>")).toBe("본문");
  });
});
