import type { ClauseEvidence, ClauseRetrievalFailure, ClauseSearchResult, ConfidenceLabel, FindClauseInput, StandardDocument, StandardSection, StandardSummary } from "../api/kcsc-types.js";
import { KcscClientError } from "../api/kcsc-client.js";
import { StandardsService, StandardsServiceError } from "./standards.js";

const SYNONYMS: readonly (readonly string[])[] = [
  ["되메우기", "되메움", "backfill", "뒷채움"],
  ["다짐", "compaction", "밀도관리", "현장밀도"],
  ["흙막이", "가시설", "토류벽", "토류"],
  ["배수", "집수", "우수", "관거", "암거"],
  ["연약지반", "지반개량", "치환", "압밀"],
  ["방수", "차수", "누수", "지수"],
  ["말뚝", "파일", "pile"],
  ["교좌장치", "교좌", "받침", "bridge bearing"],
  ["신축이음", "expansion joint", "이음장치"],
  ["균열", "보수", "보강", "repair"],
  ["콘크리트", "타설", "양생", "레미콘"],
  ["철근", "배근", "조립"],
  ["강재", "강구조", "용접", "welding"],
  ["계측", "침하", "변위", "계측관리"],
  ["터널", "라이닝", "지보"]
];

export class ClauseSearchError extends Error {
  constructor(message: string, readonly failures: readonly ClauseRetrievalFailure[]) {
    super(message);
    this.name = "ClauseSearchError";
  }
}

export class ClauseFinder {
  constructor(private readonly standards: StandardsService) {}

  async findClause(input: FindClauseInput): Promise<readonly ClauseEvidence[]> {
    const result = await this.findClauseWithDiagnostics(input);
    if (result.failures.length > 0) {
      throw new ClauseSearchError("Clause search is incomplete. Use findClauseWithDiagnostics to inspect partial results.", result.failures);
    }
    return result.clauses;
  }

  async findClauseWithDiagnostics(input: FindClauseInput): Promise<ClauseSearchResult> {
    const query = input.query.trim();
    if (!query) {
      throw new Error("Clause search query is required.");
    }

    const { documents, failures, candidateCodes } = input.standardCode
      ? { documents: [await this.standards.getStandard(input.standardCode)], failures: [], candidateCodes: [] }
      : await this.getCandidateDocuments(input, query);

    const terms = expandTerms(query);
    const evidences = documents.flatMap((document) => rankDocumentSections(document, terms));

    const clauses = evidences
      .filter((evidence) => evidence.score > 0)
      .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code, "ko"))
      .slice(0, input.limit ?? 10);
    const searchedCodes = documents.map((document) => document.code);
    return {
      clauses,
      failures,
      searchScope: input.standardCode ? "standard" : searchedCodes.length > 0 ? "candidates" : "unresolved",
      searchedCodes,
      ...(input.standardCode || searchedCodes.length > 0 ? {} : { scopeNote: unresolvedScopeNote(candidateCodes) })
    };
  }

  private async getCandidateDocuments(input: FindClauseInput, query: string): Promise<{ readonly documents: readonly StandardDocument[]; readonly failures: readonly ClauseRetrievalFailure[]; readonly candidateCodes: readonly string[] }> {
    const candidates = await this.standards.searchStandard({ ...input, query: expandTerms(query).join(" "), limit: Math.min(input.limit ?? 5, 5) });
    const documents: StandardDocument[] = [];
    const failures: ClauseRetrievalFailure[] = [];

    for (const candidate of candidates) {
      try {
        documents.push(await this.standards.getStandard(candidate.code));
      } catch (error) {
        if (!(error instanceof KcscClientError) && !(error instanceof StandardsServiceError)) {
          throw error;
        }
        failures.push({ code: candidate.code, message: error.message });
      }
    }

    if (candidates.length > 0 && documents.length === 0) {
      const details = failures.map((failure) => `${failure.code}: ${failure.message}`).join("; ");
      throw new ClauseSearchError(`KCSC detail retrieval failed for all candidate standards. ${details}`, failures);
    }
    return { documents, failures, candidateCodes: candidates.map((candidate) => candidate.code) };
  }
}

function unresolvedScopeNote(candidateCodes: readonly string[]): string {
  const known = candidateCodes.length > 0 ? `기준번호로 직접 조회가 가능한 후보: ${candidateCodes.join(", ")}.` : "";
  return `기준번호 없이 후보 기준 본문을 찾지 못했습니다. 본문 표현이 기준명이나 분류경로에 없으면 후보 탐색이 불가능하며, 이는 해당 표현에 근거가 없다는 뜻이 아닙니다. ${known} 검색어 변경이나 기준번호 지정으로 다시 시도하십시오.`;
}

export function expandTerms(query: string): readonly string[] {
  const baseTerms = tokenize(query);
  const expanded = new Set(baseTerms);

  for (const group of SYNONYMS) {
    if (group.some((term) => baseTerms.includes(term.toLowerCase()))) {
      for (const term of group) {
        expanded.add(term.toLowerCase());
      }
    }
  }

  return [...expanded];
}

export function rankDocumentSections(document: StandardDocument, terms: readonly string[]): readonly ClauseEvidence[] {
  const pathStack: string[] = [];
  const provenanceComplete = document.evidenceGaps.length === 0;
  return document.sections.map((section) => {
    updatePath(pathStack, section);
    const text = section.text.trim();
    const score = scoreSection(section, pathStack, terms);
    const confidence = confidenceFor(text, score, hasBodyTerm(text, terms), provenanceComplete);

    return {
      standardType: document.standardType,
      codeType: document.codeType,
      ...(document.specialtyType ? { specialtyType: document.specialtyType } : {}),
      code: document.code,
      apiCode: document.apiCode,
      name: document.name,
      ...(document.updateDate ? { updateDate: document.updateDate } : {}),
      ...(document.version ? { version: document.version } : {}),
      sourceUrl: document.sourceUrl,
      sectionTitle: section.title,
      sectionLabel: section.label,
      sectionPath: [...pathStack],
      text,
      confidence,
      score
    };
  });
}

function updatePath(pathStack: string[], section: StandardSection): void {
  const level = section.level ?? 1;
  const title = section.title.trim();
  if (!title) {
    return;
  }
  pathStack.splice(Math.max(level - 1, 0));
  pathStack[level - 1] = title;
}

function scoreSection(section: StandardSection, path: readonly string[], terms: readonly string[]): number {
  const haystack = `${path.join(" ")} ${section.title} ${section.label} ${section.text}`.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) {
      score += section.text.toLowerCase().includes(term) ? 5 : 2;
    }
  }
  if (section.text === "내용 없음" || section.text.length === 0) {
    score -= 10;
  }
  return score;
}

function confidenceFor(text: string, score: number, bodyMatched: boolean, provenanceComplete: boolean): ConfidenceLabel {
  if (score > 0 && bodyMatched && text.length > 0 && text !== "내용 없음" && provenanceComplete) {
    return "원문 직접 근거";
  }
  if (score > 0) {
    return "관련 조항 추론";
  }
  return "근거 미확인";
}

function hasBodyTerm(text: string, terms: readonly string[]): boolean {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function tokenize(input: string): readonly string[] {
  return input
    .replace(/[()\[\]{}"']/g, " ")
    .split(/[\s,，·/]+/)
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 0);
}
