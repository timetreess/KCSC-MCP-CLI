#!/usr/bin/env node

import type { KcscListItem, ApplicabilityResult, ClauseEvidence, CitationVerification, LatestCheckResult, SearchStandardInput, StandardDocument, StandardDualResult, StandardSummary } from "../api/kcsc-types.js";
import { ApplicabilityChecker } from "../core/applicability.js";
import { ClauseFinder } from "../core/clauses.js";
import { verifyCitations } from "../core/citations.js";
import { createKcscClient, createStandardsService } from "../core/service-factory.js";
import { buildSearchInputFromOptions, parseProjectType, parseWorkType } from "../core/validators.js";
import type { StandardsService } from "../core/standards.js";
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export interface CliIo {
  readonly stdout: Pick<NodeJS.WriteStream, "write">;
  readonly stderr: Pick<NodeJS.WriteStream, "write">;
}

export interface ParsedCli {
  readonly command: string;
  readonly positional: readonly string[];
  readonly options: Readonly<Record<string, string>>;
}

export interface CliDependencies {
  readonly createService?: () => StandardsService;
  readonly fetchMetadata?: () => Promise<readonly KcscListItem[]>;
  readonly readTextFile?: (path: string) => Promise<string>;
}

export async function runCli(args: readonly string[], io: CliIo = { stdout: process.stdout, stderr: process.stderr }, dependencies: CliDependencies = {}): Promise<number> {
  const parsed = parseArgs(args);
  if (parsed.command === "help" || parsed.command === "--help" || parsed.command === "-h" || parsed.command === "") {
    io.stdout.write(helpText());
    return 0;
  }

  try {
    const service = (dependencies.createService ?? createStandardsService)();
    const fetchMetadata = dependencies.fetchMetadata ?? (async () => createKcscClient().fetchCodeList());
    const readTextFile = dependencies.readTextFile ?? ((path: string) => readFile(path, "utf8"));

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

    if (parsed.command === "searchdual") {
      const query = parsed.positional.join(" ").trim();
      const results = await service.searchStandardDual(toSearchInput(query, parsed.options));
      io.stdout.write(formatSearchDualResults(results));
      return 0;
    }

    if (parsed.command === "clause") {
      const query = parsed.positional.join(" ").trim();
      const finder = new ClauseFinder(service);
      const clauses = await finder.findClause({ ...toSearchInput(query, parsed.options), ...(parsed.options.code ? { standardCode: parsed.options.code } : {}) });
      io.stdout.write(formatClauses(clauses));
      return 0;
    }

    if (parsed.command === "latest") {
      const code = parsed.positional.join(" ").trim();
      const result = await service.latestCheck(code);
      io.stdout.write(formatLatestCheck(result));
      return 0;
    }

    if (parsed.command === "applicable") {
      const code = parsed.positional.join(" ").trim();
      if (!code) {
        throw new Error("applicable requires a standard code.");
      }
      const checker = new ApplicabilityChecker(service);
      const projectType = parseProjectType(parsed.options.project);
      const workType = parseWorkType(parsed.options.work);
      const result = await checker.check({
        standardCode: code,
        ...(projectType ? { projectType } : {}),
        ...(workType ? { workType } : {})
      });
      io.stdout.write(formatApplicability(result));
      return 0;
    }

    if (parsed.command === "verify") {
      const target = parsed.positional.join(" ").trim();
      const text = parsed.options.text ?? (target ? await readTextFile(target) : "");
      if (!text.trim()) {
        throw new Error("verify requires a Markdown/text file path or --text input.");
      }
      const metadata = await fetchMetadata();
      const verifications = verifyCitations(text, metadata);
      io.stdout.write(formatCitationVerifications(verifications));
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
  return buildSearchInputFromOptions(query, options);
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

function formatSearchDualResults(results: StandardDualResult): string {
  return [
    `# KDS/KCS 동시 조회: ${results.query}`,
    "",
    "## KDS 설계기준 후보",
    formatSearchResults(results.kdsResults).trim(),
    "",
    "## KCS 표준시방서 후보",
    formatSearchResults(results.kcsResults).trim(),
    "",
    `- 주의사항: ${results.caveat}`
  ].join("\n") + "\n";
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

function formatClauses(clauses: readonly ClauseEvidence[]): string {
  if (clauses.length === 0) {
    return "현재 검색 범위에서 직접 조항 근거를 확인하지 못했습니다. 계약문서·특기시방서·추가 기준 확인이 필요합니다.\n";
  }

  return `${clauses.map((clause, index) => [
    `## ${index + 1}. ${clause.code} ${clause.name}`,
    `- 기준유형: ${clause.standardType}`,
    `- 기준코드: ${clause.code}`,
    `- 기준명: ${clause.name}`,
    `- 조항번호: ${clause.sectionLabel}`,
    `- 개정일: ${clause.updateDate ?? clause.version ?? "미확인"}`,
    `- 원문 일부: ${clause.text}`,
    `- 적용성 판단: 후보 근거입니다. 계약문서·특기시방서·발주처 요구사항 확인이 필요합니다.`,
    `- 신뢰도: ${clause.confidence}`,
    `- 출처 URL: ${clause.sourceUrl}`,
    clause.sectionPath.length > 0 ? `- 목차경로: ${clause.sectionPath.join(" > ")}` : undefined
  ].filter((line): line is string => typeof line === "string").join("\n")).join("\n\n")}\n`;
}

function formatLatestCheck(result: LatestCheckResult): string {
  return [
    `- 기준코드: ${result.standard?.code ?? result.inputCode}`,
    `- 최신본 여부: ${result.latestKnown ? "현재 KCSC metadata에서 확인됨" : "미확인"}`,
    `- 존재 여부: ${result.exists ? "확인됨" : "미확인"}`,
    `- 메타데이터 상태: ${result.metadataStatus}`,
    result.standard ? `- 기준명: ${result.standard.name}` : undefined,
    result.standard ? `- 개정일: ${result.standard.updateDate ?? result.standard.version ?? "미확인"}` : undefined,
    result.standard ? `- 출처 URL: ${result.standard.sourceUrl}` : undefined,
    `- 적용성 판단: 최신 metadata 확인은 프로젝트 계약 적용 여부를 의미하지 않습니다.`,
    `- 메시지: ${result.message}`
  ].filter((line): line is string => typeof line === "string").join("\n") + "\n";
}

function formatApplicability(result: ApplicabilityResult): string {
  return [
    `# ${result.standard.code} ${result.standard.name}`,
    `- 기준코드: ${result.standard.code}`,
    `- 기준명: ${result.standard.name}`,
    result.requestedProjectType ? `- 요청 프로젝트: ${result.requestedProjectType}` : undefined,
    result.requestedWorkType ? `- 요청 공종: ${result.requestedWorkType}` : undefined,
    `- 관련 프로젝트 후보: ${result.matchedProjects.length > 0 ? result.matchedProjects.join(", ") : "미확인"}`,
    `- 관련 공종 후보: ${result.matchedWorks.length > 0 ? result.matchedWorks.join(", ") : "미확인"}`,
    `- 적용성 판단: ${result.recommendation}`,
    `- 신뢰도: ${result.confidence}`,
    result.reasoning.length > 0 ? `- 판단 근거: ${result.reasoning.join(" / ")}` : undefined,
    `- 주의사항: ${result.caveat}`,
    `- 출처 URL: ${result.standard.sourceUrl}`
  ].filter((line): line is string => typeof line === "string").join("\n") + "\n";
}

function formatCitationVerifications(verifications: readonly CitationVerification[]): string {
  if (verifications.length === 0) {
    return "검증 가능한 KDS/KCS/전문시방서 코드 인용을 찾지 못했습니다.\n";
  }

  return `${verifications.map((verification) => [
    `## ${verification.normalized}`,
    `- 원문 인용: ${verification.raw}`,
    `- 존재 여부: ${verification.exists ? "확인됨" : "미확인"}`,
    verification.standard ? `- 기준명: ${verification.standard.name}` : undefined,
    verification.standard ? `- 개정일: ${verification.standard.updateDate ?? verification.standard.version ?? "미확인"}` : undefined,
    verification.standard ? `- 출처 URL: ${verification.standard.sourceUrl}` : undefined,
    `- 메시지: ${verification.message}`
  ].filter((line): line is string => typeof line === "string").join("\n")).join("\n\n")}\n`;
}

function helpText(): string {
  return `KCSC Standards CLI\n\nUsage:\n  kcsc search "터널 방수" [--type KDS|KCS|specialty|all] [--specialty EXCS] [--project road] [--work earthwork] [--limit 10]\n  kcsc searchdual "터널 방수" [--project tunnel] [--work waterproofing] [--limit 10]\n  kcsc get "KDS 11 10 05"\n  kcsc clause "되메우기 다짐" [--code "KCS 11 20 15"] [--project road] [--work earthwork]\n  kcsc applicable "KDS 11 10 05" [--project road] [--work earthwork]\n  kcsc latest "KDS 11 10 05"\n  kcsc verify ./report.md\n  kcsc verify --text "KDS 11 10 05에 따른다"\n`;
}

const invokedAsEntrypoint = process.argv[1]
  ? realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])
  : false;

if (invokedAsEntrypoint) {
  const exitCode = await runCli(process.argv.slice(2));
  process.exit(exitCode);
}
