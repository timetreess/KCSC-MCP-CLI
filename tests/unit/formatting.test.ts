import { describe, expect, it } from "vitest";
import { normalizeHtml } from "../../src/core/formatting.js";

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

  it("removes script content", () => {
    expect(normalizeHtml("<script>alert(1)</script><p>본문</p>")).toBe("본문");
  });
});
