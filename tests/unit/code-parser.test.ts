import { describe, expect, it } from "vitest";
import { formatStandardCode, parseStandardCode } from "../../src/core/code-parser.js";

describe("code parser", () => {
  it.each([
    ["KDS 11 10 05", "KDS", "111005", "KDS 11 10 05"],
    ["KCS 57 10 05", "KCS", "571005", "KCS 57 10 05"],
    ["KDS-11-10-05", "KDS", "111005", "KDS 11 10 05"],
    ["KDS_11_10_05", "KDS", "111005", "KDS 11 10 05"],
    ["kds111005", "KDS", "111005", "KDS 11 10 05"],
    ["EXCS 44 50 10", "EXCS", "445010", "EXCS 44 50 10"]
  ])("parses %s", (input, type, apiCode, formatted) => {
    expect(parseStandardCode(input)).toEqual({ type, apiCode, formatted });
  });

  it.each(["KDS 11 10", "KDF 11 10 05", "KDS AA BB CC", ""])("rejects invalid code %s", (input) => {
    expect(parseStandardCode(input)).toBeNull();
  });

  it("formats six digit API codes", () => {
    expect(formatStandardCode("KDS", "111005")).toBe("KDS 11 10 05");
  });
});
