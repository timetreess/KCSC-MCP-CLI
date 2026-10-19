import { describe, expect, it } from "vitest";
import { KcscClient, type FetchLike } from "../../src/api/kcsc-client.js";
import { ClauseFinder } from "../../src/core/clauses.js";
import { StandardsService } from "../../src/core/standards.js";
import { searchEvaluationCases } from "../fixtures/search-evaluation.js";

function finderFor(metadata: unknown, viewer: unknown): ClauseFinder {
  const fetchFn: FetchLike = async (url) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => (url.includes("CodeList") ? metadata : viewer)
  });
  return new ClauseFinder(new StandardsService(new KcscClient({ apiKey: "test-secret", fetchFn })));
}

const metadataCases = searchEvaluationCases.filter((testCase) => testCase.discovery === "metadata");
const bodyOnlyCases = searchEvaluationCases.filter((testCase) => testCase.discovery === "body-only");

/**
 * Guards the representative practitioner queries from the review. Candidate discovery ranks KCSC
 * metadata only, so this set separates queries whose wording appears in a standard name from
 * queries that exist solely in a document body.
 */
describe("clause search discovery evaluation", () => {
  for (const testCase of metadataCases) {
    it(`finds expected evidence for "${testCase.query}" without a standard code`, async () => {
      const result = await finderFor(testCase.metadata, testCase.viewer).findClauseWithDiagnostics({ query: testCase.query });
      expect(result.searchScope).toBe("candidates");
      expect(result.clauses.map((clause) => clause.code)).toContain(testCase.expectedCode);
      expect(result.clauses.some((clause) => clause.text.includes(testCase.expectedText))).toBe(true);
    });
  }

  for (const testCase of bodyOnlyCases) {
    it(`reports an unresolved scope for body-only wording "${testCase.query}"`, async () => {
      const result = await finderFor(testCase.metadata, testCase.viewer).findClauseWithDiagnostics({ query: testCase.query });
      expect(result.searchScope).toBe("unresolved");
      expect(result.clauses).toEqual([]);
      expect(result.scopeNote).toContain("근거가 없다는 뜻이 아닙니다");
    });

    it(`still finds the same evidence when the code is supplied for "${testCase.query}"`, async () => {
      const result = await finderFor(testCase.metadata, testCase.viewer).findClauseWithDiagnostics({ query: testCase.query, standardCode: testCase.expectedCode });
      expect(result.searchScope).toBe("standard");
      expect(result.clauses.map((clause) => clause.code)).toContain(testCase.expectedCode);
      expect(result.clauses.some((clause) => clause.text.includes(testCase.expectedText))).toBe(true);
    });
  }

  it("ranks multiple candidates for one practitioner query and fetches each body", async () => {
    const metadata = [
      { codeType: "KDS", code: "116030", name: "옹벽 말뚝기초", version: "2025", listParentCodes: [{ codeType: "KDS", fullCode: "1011", name: "지반 설계기준" }] },
      { codeType: "KDS", code: "115025", name: "말뚝기초 설계", version: "2025", listParentCodes: [{ codeType: "KDS", fullCode: "1011", name: "지반 설계기준" }] }
    ];
    const fetchFn: FetchLike = async (url) => {
      if (url.includes("CodeList")) {
        return { ok: true, status: 200, statusText: "OK", json: async () => metadata };
      }
      const code = /\/CodeViewer\/KDS\/(\d{6})/.exec(url)?.[1];
      const item = metadata.find((candidate) => candidate.code === code);
      return {
        ok: Boolean(item),
        status: item ? 200 : 404,
        statusText: item ? "OK" : "Not Found",
        json: async () => (item ? [{ ...item, list: [{ sort: 1, title: "말뚝", label: "본문", contents: `<p>${item.name}는 말뚝으로 지지한다.</p>` }] }] : [])
      };
    };
    const finder = new ClauseFinder(new StandardsService(new KcscClient({ apiKey: "test-secret", fetchFn })));
    const result = await finder.findClauseWithDiagnostics({ query: "말뚝", limit: 5 });
    expect(result.searchScope).toBe("candidates");
    expect(result.searchedCodes.length).toBeGreaterThanOrEqual(2);
    expect(result.failures).toEqual([]);
  });

  it("covers representative practitioner queries in both discovery classes", () => {
    expect(metadataCases.length).toBeGreaterThanOrEqual(8);
    expect(bodyOnlyCases.length).toBeGreaterThanOrEqual(1);
  });
});