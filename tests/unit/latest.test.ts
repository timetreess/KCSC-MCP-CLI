import { describe, expect, it } from "vitest";
import { KcscClient, type FetchLike } from "../../src/api/kcsc-client.js";
import { StandardsService } from "../../src/core/standards.js";
import { codeListFixture } from "../fixtures/kcsc-fixtures.js";

function serviceWithCodeList(): StandardsService {
  const fetchFn: FetchLike = async () => ({ ok: true, status: 200, statusText: "OK", json: async () => codeListFixture });
  return new StandardsService(new KcscClient({ apiKey: "test-secret", fetchFn }));
}

describe("latestCheck", () => {
  it("confirms current metadata without claiming applicability", async () => {
    const result = await serviceWithCodeList().latestCheck("KDS 11 10 05");
    expect(result.exists).toBe(true);
    expect(result.latestKnown).toBe(true);
    expect(result.message).toContain("not project contractual applicability");
  });

  it("does not treat absence as proof no standard exists", async () => {
    const result = await serviceWithCodeList().latestCheck("KDS 99 99 99");
    expect(result.exists).toBe(false);
    expect(result.message).toContain("not proof");
  });
});
