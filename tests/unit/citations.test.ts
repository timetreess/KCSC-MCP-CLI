import { describe, expect, it } from "vitest";
import { extractCitations, verifyCitations } from "../../src/core/citations.js";
import { codeListFixture } from "../fixtures/kcsc-fixtures.js";

describe("citations", () => {
  it("extracts and deduplicates KDS/KCS citations", () => {
    const citations = extractCitations("KDS 11 10 05 및 KDS-11-10-05, KCS 57 10 05를 따른다.");
    expect(citations.map((citation) => citation.normalized)).toEqual(["KDS 11 10 05", "KCS 57 10 05"]);
  });

  it("extracts specialty family citations", () => {
    expect(extractCitations("EXCS 44 50 10")[0]?.codeType).toBe("EXCS");
  });

  it("verifies citation existence against CodeList metadata", () => {
    const verifications = verifyCitations("KDS 11 10 05 및 KCS 99 99 99", codeListFixture);
    expect(verifications[0]?.exists).toBe(true);
    expect(verifications[1]?.exists).toBe(false);
    expect(verifications[1]?.message).toContain("not found");
  });
});
