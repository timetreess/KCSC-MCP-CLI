import { describe, expect, it } from "vitest";
import { KcscClient, KcscClientError, type FetchLike } from "../../src/api/kcsc-client.js";
import { StandardsService } from "../../src/core/standards.js";
import {
  applicabilityOutputSchema,
  citationsOutputSchema,
  clausesOutputSchema,
  documentOutputSchema,
  dualOutputSchema,
  latestOutputSchema,
  resultsOutputSchema
} from "../../src/mcp/schemas.js";
import { codeListFixture, kdsViewerFixture } from "../fixtures/kcsc-fixtures.js";
import { searchEvaluationCases } from "../fixtures/search-evaluation.js";

const ok = (data: unknown) => ({ ok: true, status: 200, statusText: "OK", json: async () => data });
const serviceWith = (fetchFn: FetchLike) => new StandardsService(new KcscClient({ apiKey: "test-secret", fetchFn }));

/**
 * The tool result schemas are the published MCP contract. `z.unknown()` accepted `{}`, which let
 * malformed payloads reach the client, so each payload must be rejected when it breaks that contract.
 */
describe("MCP output schemas reject malformed payloads", () => {
  it("rejects search results without the required array", () => {
    expect(resultsOutputSchema.safeParse({ results: "not-an-array" }).success).toBe(false);
    expect(resultsOutputSchema.safeParse({}).success).toBe(false);
    expect(resultsOutputSchema.safeParse({ results: [] }).success).toBe(true);
  });

  it("rejects a document missing required evidence fields", () => {
    expect(documentOutputSchema.safeParse({ document: {} }).success).toBe(false);
    expect(documentOutputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects clause results without search scope", () => {
    expect(clausesOutputSchema.safeParse({ clauses: [], failures: [] }).success).toBe(false);
    expect(clausesOutputSchema.safeParse({ clauses: [], failures: [], searchScope: "nonsense", searchedCodes: [] }).success).toBe(false);
    expect(clausesOutputSchema.safeParse({ clauses: [], failures: [], searchScope: "unresolved", searchedCodes: [] }).success).toBe(true);
  });

  it("rejects latest, dual, applicability, and citation payloads that break their contract", () => {
    expect(latestOutputSchema.safeParse({ result: {} }).success).toBe(false);
    expect(dualOutputSchema.safeParse({ result: {} }).success).toBe(false);
    expect(applicabilityOutputSchema.safeParse({ result: {} }).success).toBe(false);
    expect(citationsOutputSchema.safeParse({ citations: "nope" }).success).toBe(false);
  });

  it("accepts real service payloads from the shared core", async () => {
    const service = serviceWith(async (url) => ok(url.includes("CodeList") ? codeListFixture : kdsViewerFixture));
    const search = await service.searchStandard({ query: "KDS 11 10 05" });
    expect(resultsOutputSchema.safeParse({ results: search }).success).toBe(true);

    const document = await service.getStandard("KDS111005");
    expect(documentOutputSchema.safeParse({ document }).success).toBe(true);

    const latest = await service.latestCheck("KDS111005");
    expect(latestOutputSchema.safeParse({ result: latest }).success).toBe(true);

    const dual = await service.searchStandardDual({ query: "공통" });
    expect(dualOutputSchema.safeParse({ result: dual }).success).toBe(true);
  });
});

describe("metadata snapshot reuse", () => {
  it("fetches CodeList once for a dual search", async () => {
    let calls = 0;
    const service = serviceWith(async () => {
      calls += 1;
      return ok(codeListFixture);
    });
    await service.searchStandardDual({ query: "공통" });
    expect(calls).toBe(1);
  });

  it("reuses one snapshot when search and latest check run concurrently", async () => {
    let calls = 0;
    const service = serviceWith(async () => {
      calls += 1;
      return ok(codeListFixture);
    });
    await Promise.all([service.searchStandard({ query: "공통" }), service.latestCheck("KDS111005")]);
    expect(calls).toBe(1);
  });

  it("returns identical dual results whether or not the snapshot is shared", async () => {
    const service = serviceWith(async () => ok(codeListFixture));
    const dual = await service.searchStandardDual({ query: "터널 방수", projectType: "tunnel", workType: "waterproofing" });
    expect(dual.kdsResults.every((item) => item.standardType === "KDS")).toBe(true);
    expect(dual.kcsResults.every((item) => item.standardType === "KCS")).toBe(true);
  });
});

describe("request deadline and cancellation", () => {
  it("aborts a request that exceeds the deadline and reports it as a timeout", async () => {
    const fetchFn: FetchLike = (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    });
    const client = new KcscClient({ apiKey: "test-secret", fetchFn, requestTimeoutMs: 25 });
    const error = await client.fetchCodeList().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(KcscClientError);
    expect((error as KcscClientError).message).toContain("timed out");
  });

  it("passes an abort signal to the underlying request", async () => {
    let received: AbortSignal | undefined;
    const client = new KcscClient({
      apiKey: "test-secret",
      fetchFn: (_url, init) => {
        received = init?.signal;
        return Promise.resolve(ok(codeListFixture));
      }
    });
    await client.fetchCodeList();
    expect(received).toBeInstanceOf(AbortSignal);
  });

  it("cancels in-flight work when the caller aborts", async () => {
    const controller = new AbortController();
    const client = new KcscClient({
      apiKey: "test-secret",
      fetchFn: (_url, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })
    });
    const pending = client.fetchCodeList({ signal: controller.signal }).catch((caught: unknown) => caught);
    controller.abort();
    const error = await pending;
    expect((error as KcscClientError).message).toContain("cancelled");
  });

  it("reports a transport failure without leaking the API key", async () => {
    const client = new KcscClient({
      apiKey: "test-secret",
      fetchFn: async (url) => {
        throw new Error(`network down for ${url}`);
      }
    });
    const error = await client.fetchCodeList().catch((caught: unknown) => caught);
    expect(String(error)).not.toContain("test-secret");
  });
});

describe("evaluation payloads satisfy the MCP contract", () => {
  it("validates every evaluation document result", async () => {
    for (const testCase of searchEvaluationCases.slice(0, 3)) {
      const service = serviceWith(async () => ok(testCase.viewer));
      const document = await service.getStandard(testCase.expectedCode.replaceAll(" ", ""));
      expect(documentOutputSchema.safeParse({ document }).success).toBe(true);
    }
  });
});