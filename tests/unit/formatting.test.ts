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

  it("preserves superscript and subscript meaning instead of flattening it", () => {
    expect(normalizeHtml("<p>침투계수 10<sup>-6</sup> cm/s</p>")).toBe("침투계수 10^-6 cm/s");
    expect(normalizeHtml("<p>단위면적 m<sup>2</sup></p>")).toBe("단위면적 m^2");
    expect(normalizeHtml("<p>산소 농도 H<sub>2</sub>O</p>")).toBe("산소 농도 H_2O");
    expect(normalizeHtml("<p>10<sup><b>-6</b></sup></p>")).toBe("10^-6");
  });

  it("marks image-only content instead of silently dropping it", () => {
    expect(normalizeHtml('<p>설계식 <img src="f1.png" alt="응력 산정식"></p>')).toBe("설계식 [그림: 응력 산정식]");
    expect(normalizeHtml('<p><img src="f2.png"></p>')).toBe("[그림]");
  });
});
