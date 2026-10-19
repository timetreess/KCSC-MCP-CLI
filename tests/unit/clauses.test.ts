import { describe, expect, it } from "vitest";
import { KcscClient, type FetchLike } from "../../src/api/kcsc-client.js";
import { ClauseFinder, expandTerms, rankDocumentSections } from "../../src/core/clauses.js";
import { StandardsService } from "../../src/core/standards.js";
import { codeListFixture, kdsViewerFixture } from "../fixtures/kcsc-fixtures.js";

function finderWithViewer(): ClauseFinder {
  const fetchFn: FetchLike = async () => ({ ok: true, status: 200, statusText: "OK", json: async () => kdsViewerFixture });
  return new ClauseFinder(new StandardsService(new KcscClient({ apiKey: "test-secret", fetchFn })));
}

function finderWithFailures(allFailed = false): ClauseFinder {
  const fetchFn: FetchLike = async (url) => {
    const ok = url.includes("CodeList") || (!allFailed && url.includes("/KDS/"));
    return { ok, status: ok ? 200 : 503, statusText: ok ? "OK" : "Service Unavailable", json: async () => url.includes("CodeList") ? codeListFixture : kdsViewerFixture };
  };
  return new ClauseFinder(new StandardsService(new KcscClient({ apiKey: "test-secret", fetchFn })));
}

describe("ClauseFinder", () => {
  it("expands civil engineering synonyms", () => {
    expect(expandTerms("되메우기")).toContain("backfill");
    expect(expandTerms("다짐")).toContain("compaction");
  });

  it("finds direct clause evidence inside a specific standard", async () => {
    const clauses = await finderWithViewer().findClause({ query: "되메우기 다짐", standardCode: "KDS 11 10 05" });
    expect(clauses[0]?.text).toContain("되메우기");
    expect(clauses[0]?.confidence).toBe("원문 직접 근거");
    expect(clauses[0]?.sectionPath.join(" > ")).toContain("되메우기");
  });

  it("reports normal empty searches separately from retrieval failures", async () => {
    const finder = finderWithFailures(true);
    const result = await finder.findClauseWithDiagnostics({ query: "unmatched-topic" });
    expect(result.clauses).toEqual([]);
    expect(result.failures).toEqual([]);
    expect(result.searchScope).toBe("unresolved");
    await expect(finder.findClause({ query: "unmatched-topic" })).resolves.toEqual([]);
  });

  it("searches the resolved candidate bodies even when no clause matches", async () => {
    const result = await finderWithViewer().findClauseWithDiagnostics({ query: "지반 설계기준 일반사항" });
    expect(result.searchScope).toBe("candidates");
    expect(result.searchedCodes).toEqual(["KDS 11 10 05"]);
    expect(result.scopeNote).toBeUndefined();
  });

  it("fails when every candidate document retrieval fails", async () => {
    const finder = finderWithFailures(true);
    await expect(finder.findClause({ query: "지반" })).rejects.toThrow("all candidate");
    await expect(finder.findClauseWithDiagnostics({ query: "지반" })).rejects.toThrow("all candidate");
  });

  it("returns partial evidence with failed document diagnostics", async () => {
    const result = await finderWithFailures().findClauseWithDiagnostics({ query: "공통 지반" });
    expect(result.clauses[0]?.text).toContain("지반설계");
    expect(result.failures).toEqual([{ code: "KCS 57 10 05", message: "KCSC OpenAPI request failed: HTTP 503" }]);
    await expect(finderWithFailures().findClause({ query: "공통 지반" })).rejects.toThrow("incomplete");
  });

  it("keeps partial failure diagnostics even when successful documents contain no matching clauses", async () => {
    const result = await finderWithFailures().findClauseWithDiagnostics({ query: "공통" });
    expect(result.clauses).toEqual([]);
    expect(result.failures).toHaveLength(1);
  });

  it("reports an unresolved scope instead of implying the body was searched", async () => {
    const result = await finderWithViewer().findClauseWithDiagnostics({ query: "되메우기 다짐" });
    expect(result.searchScope).toBe("unresolved");
    expect(result.clauses).toEqual([]);
    expect(result.searchedCodes).toEqual([]);
    expect(result.scopeNote).toContain("근거가 없다는 뜻이 아닙니다");
  });

  it("reports a resolved search scope when a code is supplied", async () => {
    const result = await finderWithViewer().findClauseWithDiagnostics({ query: "되메우기 다짐", standardCode: "KDS111005" });
    expect(result.searchScope).toBe("standard");
    expect(result.scopeNote).toBeUndefined();
    expect(result.clauses[0]?.text).toContain("되메우기");
  });

  it("resolves candidates and searches their bodies when metadata matches", async () => {
    const result = await finderWithViewer().findClauseWithDiagnostics({ query: "지반 설계" });
    expect(result.searchScope).toBe("candidates");
    expect(result.clauses[0]?.text).toContain("지반설계");
  });

  it("uses expanded terms to discover candidates with translated titles", async () => {
    const metadata = [{ codeType: "KCS", code: "213010", name: "Backfill and compaction works", listParentCodes: [{ codeType: "KCS", fullCode: "2021", name: "Earth works" }] }];
    const viewer = [{ codeType: "KCS", code: "213010", name: "Backfill and compaction works", version: "2022", list: [{ sort: 1, title: "Compaction", label: "본문", contents: "<p>되메우기 다짐은 층별로 수행한다.</p>" }] }];
    const finder = new ClauseFinder(new StandardsService(new KcscClient({
      apiKey: "test-secret",
      fetchFn: async (url) => ({ ok: true, status: 200, statusText: "OK", json: async () => url.includes("CodeList") ? metadata : viewer })
    })));
    const result = await finder.findClauseWithDiagnostics({ query: "되메우기 다짐" });
    expect(result.searchScope).toBe("candidates");
    expect(result.clauses[0]?.code).toBe("KCS 21 30 10");
    expect(result.clauses[0]?.text).toContain("되메우기 다짐");
  });

  it("never emits empty or undefined breadcrumbs in the section path", async () => {
    const clauses = await finderWithViewer().findClause({ query: "되메우기 다짐", standardCode: "KDS111005" });
    for (const clause of clauses) {
      expect(clause.sectionPath.every((entry) => typeof entry === "string" && entry.trim().length > 0)).toBe(true);
      expect(clause.sectionPath[0]).toBeDefined();
    }
    expect(clauses[0]?.sectionPath.at(-1)).toBe("4.5 되메우기 및 다짐");
  });

  it("treats title-only matches as related evidence rather than direct evidence", () => {
    const clauses = rankDocumentSections(
      {
        standardType: "KDS",
        codeType: "KDS",
        code: "KDS 11 10 05",
        apiCode: "111005",
        name: "지반 설계 일반",
        sourceUrl: "https://kcsc.re.kr/OpenApi/CodeViewer/KDS/111005",
        parentPath: [],
        confidence: "근거 미확인",
        evidenceGaps: [],
        sections: [{ sort: 1, title: "4.5 되메우기", level: 2, label: "4.5", html: "<p>재료 기준</p>", text: "재료 기준" }]
      },
      ["되메우기"]
    );
    expect(clauses[0]?.confidence).toBe("관련 조항 추론");
  });

  it("does not claim direct evidence when the source document lacks provenance", () => {
    const clauses = rankDocumentSections(
      {
        standardType: "KDS",
        codeType: "KDS",
        code: "KDS 11 10 05",
        apiCode: "111005",
        name: "KDS 11 10 05",
        sourceUrl: "https://kcsc.re.kr/OpenApi/CodeViewer/KDS/111005",
        parentPath: [],
        confidence: "관련 조항 추론",
        evidenceGaps: ["기준명", "개정일/update date"],
        sections: [{ sort: 1, title: "4.5 되메우기", level: 2, label: "4.5", html: "<p>재료 기준</p>", text: "재료 기준" }]
      },
      ["되메우기"]
    );
    expect(clauses[0]?.confidence).toBe("관련 조항 추론");
  });
});
