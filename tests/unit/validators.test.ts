import { describe, expect, it } from "vitest";
import { buildSearchInputFromOptions, parseLimit, parseProjectType, parseStandardTypeFilter, parseWorkType } from "../../src/core/validators.js";

describe("validators", () => {
  it("parses supported CLI option enum values", () => {
    expect(parseStandardTypeFilter("KDS")).toBe("KDS");
    expect(parseProjectType("road")).toBe("road");
    expect(parseWorkType("earthwork")).toBe("earthwork");
  });

  it("rejects unsupported CLI option enum values", () => {
    expect(() => parseProjectType("roads")).toThrow("Invalid project type");
    expect(() => parseWorkType("unknown")).toThrow("Invalid work type");
  });

  it("validates numeric limits", () => {
    expect(parseLimit("5", 50)).toBe(5);
    expect(() => parseLimit("0", 50)).toThrow("Invalid limit");
    expect(() => parseLimit("abc", 50)).toThrow("Invalid limit");
  });

  it("builds typed search input from CLI options", () => {
    expect(buildSearchInputFromOptions("터널", { type: "KCS", specialty: "all_specialty", project: "tunnel", work: "waterproofing", limit: "3" })).toEqual({
      query: "터널",
      standardType: "KCS",
      specialtyType: "all_specialty",
      projectType: "tunnel",
      workType: "waterproofing",
      limit: 3
    });
  });
});
