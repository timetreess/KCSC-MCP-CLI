import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { KcscClient } from "../api/kcsc-client.js";
import type { SearchStandardInput } from "../api/kcsc-types.js";
import { createKcscClient, createStandardsService } from "../core/service-factory.js";
import type { StandardsService } from "../core/standards.js";

export interface KcscToolDependencies {
  readonly createService?: () => StandardsService;
  readonly createClient?: () => KcscClient;
}

export interface SnakeCaseSearchInput {
  readonly query: string;
  readonly standard_type?: SearchStandardInput["standardType"];
  readonly specialty_type?: SearchStandardInput["specialtyType"];
  readonly project_type?: SearchStandardInput["projectType"];
  readonly work_type?: SearchStandardInput["workType"];
  readonly limit?: number | undefined;
}

export function getStandardsService(dependencies: KcscToolDependencies): StandardsService {
  return (dependencies.createService ?? createStandardsService)();
}

export function getKcscClient(dependencies: KcscToolDependencies): KcscClient {
  return (dependencies.createClient ?? createKcscClient)();
}

export function toSearchInput(input: SnakeCaseSearchInput): SearchStandardInput {
  return {
    query: input.query,
    ...(input.standard_type ? { standardType: input.standard_type } : {}),
    ...(input.specialty_type ? { specialtyType: input.specialty_type } : {}),
    ...(input.project_type ? { projectType: input.project_type } : {}),
    ...(input.work_type ? { workType: input.work_type } : {}),
    ...(input.limit ? { limit: input.limit } : {})
  };
}

export function toToolResult(payload: Record<string, unknown>, textPayload: unknown = payload): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(textPayload, null, 2) }],
    structuredContent: payload
  };
}

export function toToolError(error: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
    isError: true
  };
}
