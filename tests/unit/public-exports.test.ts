import { describe, expect, it } from "vitest";
import * as PUBLIC from "../../src/index.js";

describe("public exports", () => {
  it("exposes core client, parser, services, clause, and citation APIs", () => {
    expect(PUBLIC.KcscClient).toBeTypeOf("function");
    expect(PUBLIC.parseStandardCode).toBeTypeOf("function");
    expect(PUBLIC.StandardsService).toBeTypeOf("function");
    expect(PUBLIC.ClauseFinder).toBeTypeOf("function");
    expect(PUBLIC.extractCitations).toBeTypeOf("function");
    expect(PUBLIC.verifyCitations).toBeTypeOf("function");
    expect(PUBLIC.buildSearchInputFromOptions).toBeTypeOf("function");
  });
});
