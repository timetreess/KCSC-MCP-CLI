import { describe, expect, it } from "vitest";
import { KcscClient, type FetchLike } from "../../src/api/kcsc-client.js";
import { ClauseFinder, expandTerms } from "../../src/core/clauses.js";
import { StandardsService } from "../../src/core/standards.js";
import { kdsViewerFixture } from "../fixtures/kcsc-fixtures.js";

function finderWithViewer(): ClauseFinder {
  const fetchFn: FetchLike = async () => ({ ok: true, status: 200, statusText: "OK", json: async () => kdsViewerFixture });
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
});
