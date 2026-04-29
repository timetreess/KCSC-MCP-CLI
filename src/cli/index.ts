#!/usr/bin/env node

import { KcscClient } from "../api/kcsc-client.js";
import type { ProjectType, SearchStandardInput, SpecialtyTypeFilter, StandardDocument, StandardSummary, StandardTypeFilter, WorkType } from "../api/kcsc-types.js";
import { loadConfig } from "../config.js";
import { StandardsService } from "../core/standards.js";

interface CliIo {
  readonly stdout: Pick<NodeJS.WriteStream, "write">;
  readonly stderr: Pick<NodeJS.WriteStream, "write">;
}

interface ParsedCli {
  readonly command: string;
  readonly positional: readonly string[];
  readonly options: Readonly<Record<string, string>>;
}

export async function runCli(args: readonly string[], io: CliIo = { stdout: process.stdout, stderr: process.stderr }): Promise<number> {
  const parsed = parseArgs(args);
  if (parsed.command === "help" || parsed.command === "--help" || parsed.command === "-h" || parsed.command === "") {
    io.stdout.write(helpText());
    return 0;
  }

  try {
    const config = loadConfig();
    const service = new StandardsService(new KcscClient({ apiKey: config.kcscApiKey }));

    if (parsed.command === "search") {
      const query = parsed.positional.join(" ").trim();
      const results = await service.searchStandard(toSearchInput(query, parsed.options));
      io.stdout.write(formatSearchResults(results));
      return 0;
    }

    if (parsed.command === "get") {
      const code = parsed.positional.join(" ").trim();
      const document = await service.getStandard(code);
      io.stdout.write(formatDocument(document));
      return 0;
    }

    io.stderr.write(`Unknown command: ${parsed.command}\n\n${helpText()}`);
    return 1;
  } catch (error) {
    io.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

export function parseArgs(args: readonly string[]): ParsedCli {
  const [command = "", ...rest] = args;
  const positional: string[] = [];
  const options: Record<string, string> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (!value) {
      continue;
    }

    if (value.startsWith("--")) {
      const key = value.slice(2);
      const next = rest[index + 1];
      if (next && !next.startsWith("--")) {
        options[key] = next;
        index += 1;
      } else {
        options[key] = "true";
      }
      continue;
    }

    positional.push(value);
  }

  return { command, positional, options };
}

function toSearchInput(query: string, options: Readonly<Record<string, string>>): SearchStandardInput {
  return {
    query,
    ...(options.type ? { standardType: options.type as StandardTypeFilter } : {}),
    ...(options.specialty ? { specialtyType: options.specialty as SpecialtyTypeFilter } : {}),
    ...(options.project ? { projectType: options.project as ProjectType } : {}),
    ...(options.work ? { workType: options.work as WorkType } : {}),
    ...(options.limit ? { limit: Number.parseInt(options.limit, 10) } : {})
  };
}

function formatSearchResults(results: readonly StandardSummary[]): string {
  if (results.length === 0) {
    return "현재 검색 범위에서 직접 근거 후보를 확인하지 못했습니다. 계약문서·특기시방서·추가 키워드 확인이 필요합니다.\n";
  }

  return `${results
    .map((result, index) => [
      `## ${index + 1}. ${result.code} ${result.name}`,
      `- 기준유형: ${result.standardType}`,
      `- API codeType: ${result.codeType}`,
      result.specialtyType ? `- 전문시방서 계열: ${result.specialtyType}` : undefined,
      `- 기준코드: ${result.code}`,
      `- 기준명: ${result.name}`,
      `- 개정일: ${result.updateDate ?? result.version ?? "미확인"}`,
      `- 신뢰도: ${result.confidence}`,
      `- 출처 URL: ${result.sourceUrl}`,
      result.parentPath.length > 0 ? `- 분류경로: ${result.parentPath.join(" > ")}` : undefined
    ].filter((line): line is string => typeof line === "string").join("\n"))
    .join("\n\n")}\n`;
}

function formatDocument(document: StandardDocument): string {
  const sections = document.sections
    .slice(0, 30)
    .map((section) => `### ${section.title || section.label}\n- 조항번호: ${section.label}\n${section.text || "내용 없음"}`)
    .join("\n\n");

  return [
    `# ${document.code} ${document.name}`,
    "",
    `- 기준유형: ${document.standardType}`,
    `- API codeType: ${document.codeType}`,
    document.specialtyType ? `- 전문시방서 계열: ${document.specialtyType}` : undefined,
    `- 기준코드: ${document.code}`,
    `- 기준명: ${document.name}`,
    `- 개정일: ${document.updateDate ?? document.version ?? "미확인"}`,
    `- 신뢰도: ${document.confidence}`,
    `- 출처 URL: ${document.sourceUrl}`,
    "",
    sections
  ].filter((line): line is string => typeof line === "string").join("\n");
}

function helpText(): string {
  return `KCSC Standards CLI\n\nUsage:\n  kcsc search "터널 방수" [--type KDS|KCS|specialty|all] [--specialty EXCS] [--project road] [--work earthwork]\n  kcsc get "KDS 11 10 05"\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const exitCode = await runCli(process.argv.slice(2));
  process.exit(exitCode);
}
