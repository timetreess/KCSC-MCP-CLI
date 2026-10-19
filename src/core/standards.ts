import type {
  ConfidenceLabel,
  KcscListItem,
  KcscParentCode,
  KcscViewerItem,
  KcscViewerSection,
  LatestCheckResult,
  ProjectType,
  SearchStandardInput,
  SpecialtyType,
  StandardDualResult,
  StandardCodeType,
  StandardDocument,
  StandardSection,
  StandardSummary,
  StandardTypeFilter,
  WorkType
} from "../api/kcsc-types.js";
import { KcscClient } from "../api/kcsc-client.js";
import { formatStandardCode, isSupportedCodeType, parseStandardCode, standardTypeFromCodeType } from "./code-parser.js";
import { normalizeHtml } from "./formatting.js";

const SPECIALTY_TYPES: readonly SpecialtyType[] = ["EXCS", "KRACS", "KRCCS", "KWCS", "LHCS", "NHCS", "SMCS"];
const DEFAULT_LIMIT = 10;

export const PROJECT_KEYWORDS: Readonly<Record<ProjectType, readonly string[]>> = {
  road: ["도로", "포장", "일반국도", "고속도로", "차도"],
  railway: ["철도", "궤도", "신호", "레일", "노반"],
  bridge: ["교량", "교좌", "교좌장치", "신축이음", "교각", "교대"],
  tunnel: ["터널", "라이닝", "방수", "차수", "지보"],
  river: ["하천", "제방", "호안", "수문", "하상"],
  dam: ["저수지", "댐체", "여수로"],
  port: ["항만", "어항", "방파제", "부두", "하역", "호안", "해상"],
  waterworks: ["상수도", "하수도", "하수관로", "관로", "수도", "상수", "하수", "정수", "수처리"],
  site: ["단지", "택지", "조성", "택지개발", "단지조성", "기반시설"],
  building: ["건축", "건축공사", "건축물"],
  plant: ["기계설비", "전기설비", "산업환경설비", "플랜트", "정유", "가스", "산업설비"],
  common: ["공통", "총칙", "일반사항"]
};

export const WORK_KEYWORDS: Readonly<Record<WorkType, readonly string[]>> = {
  earthwork: ["토공", "되메우기", "되메움", "흙쌓기", "성토", "흙깎기", "절토", "다짐", "backfill", "compaction"],
  geotechnical: ["지반", "지질", "연약지반", "지반조사"],
  foundation: ["기초", "말뚝", "파일", "기초공", "지정"],
  concrete: ["콘크리트", "타설", "양생", "레미콘", "시멘트", "철근", "배근"],
  steel: ["강구조", "강재", "용접", "볼트", "이음"],
  temporary: ["가설", "흙막이", "토류", "가시설", "버팀", "동바리"],
  pavement: ["포장", "아스팔트", "시멘트콘크리트 포장"],
  drainage: ["배수", "집수", "우수", "관거", "암거"],
  waterproofing: ["방수", "차수", "누수", "지수"],
  seismic: ["내진", "지진"],
  quality_test: ["품질", "시험", "검사", "밀도관리"],
  measurement: ["측량", "계측"],
  safety: ["안전", "보건"],
  maintenance: ["유지관리", "보수", "보강", "점검"]
};

export class StandardsServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StandardsServiceError";
  }
}

export class StandardsService {
  constructor(private readonly client: KcscClient) {}

  async searchStandard(input: SearchStandardInput): Promise<readonly StandardSummary[]> {
    const query = input.query.trim();
    if (!query) {
      throw new StandardsServiceError("Search query is required.");
    }

    const metadata = await this.client.fetchCodeList();
    const exactCode = parseStandardCode(query);
    const terms = tokenize(query);
    const projectTerms = input.projectType ? PROJECT_KEYWORDS[input.projectType] : [];
    const workTerms = input.workType ? WORK_KEYWORDS[input.workType] : [];

    const candidates = metadata
      .map((item) => toSummary(item))
      .filter((summary): summary is StandardSummary => summary !== null)
      .filter((summary) => matchesFilters(summary, input))
      .map((summary) => scoreSummary(summary, exactCode, terms, projectTerms, workTerms))
      .filter((result) => result.score > 0 || terms.length === 0)
      .sort((a, b) => b.score - a.score || a.summary.code.localeCompare(b.summary.code, "ko"));

    return candidates.slice(0, input.limit ?? DEFAULT_LIMIT).map((candidate) => candidate.summary);
  }

  async searchStandardDual(input: Omit<SearchStandardInput, "standardType" | "specialtyType">): Promise<StandardDualResult> {
    const [kdsResults, kcsResults] = await Promise.all([
      this.searchStandard({ ...input, standardType: "KDS" }),
      this.searchStandard({ ...input, standardType: "KCS" })
    ]);

    return {
      query: input.query,
      searchedAt: new Date().toISOString(),
      kdsResults,
      kcsResults,
      caveat: "KDS/KCS 동시 조회는 주제 기반 병렬 검색 결과입니다. 코드번호의 1:1 대응이나 계약문서상 적용 우선순위를 의미하지 않습니다."
    };
  }

  async getStandard(codeInput: string): Promise<StandardDocument> {
    const parsed = parseStandardCode(codeInput);
    if (!parsed) {
      throw new StandardsServiceError("Invalid standard code format. Expected forms like KDS 11 10 05 or KCS571005.");
    }

    const item = await this.client.fetchCodeViewer(parsed.type, parsed.apiCode);
    if (!item) {
      throw new StandardsServiceError(`KCSC returned no document for ${parsed.formatted}. Check the code and standard type.`);
    }

    return toDocument(item, parsed.type, parsed.apiCode);
  }

  async latestCheck(codeInput: string): Promise<LatestCheckResult> {
    const parsed = parseStandardCode(codeInput);
    if (!parsed) {
      throw new StandardsServiceError("Invalid standard code format. Expected forms like KDS 11 10 05 or KCS571005.");
    }

    const metadata = await this.client.fetchCodeList();
    const summary = metadata
      .map((item) => toSummary(item))
      .find((candidate) => candidate?.codeType === parsed.type && candidate.apiCode === parsed.apiCode);

    if (!summary) {
      return {
        inputCode: parsed.formatted,
        exists: false,
        latestKnown: false,
        metadataStatus: "not-found-in-current-metadata",
        message: `${parsed.formatted} was not found in current KCSC CodeList metadata. Absence from this search scope is not proof that no standard exists.`
      };
    }

    return {
      inputCode: parsed.formatted,
      exists: true,
      latestKnown: true,
      metadataStatus: "current-metadata-found",
      standard: summary,
      message: `${summary.code} exists in current KCSC CodeList metadata. This confirms current metadata presence only; it does not compare historical versions or determine project contractual applicability.`
    };
  }
}

export function toSummary(item: KcscListItem): StandardSummary | null {
  const codeType = normalizeCodeType(item.codeType);
  const apiCode = typeof item.code === "string" ? item.code : undefined;
  const name = typeof item.name === "string" ? item.name : undefined;
  if (!codeType || !apiCode || !name) {
    return null;
  }

  const standardType = standardTypeFromCodeType(codeType);
  const specialtyType = getSpecialtyType(codeType);
  const parentPath = parentPathFrom(item.listParentCodes);
  const version = nullToUndefined(item.version);
  const updateDate = nullToUndefined(item.updateDate);
  const fullCode = nullToUndefined(item.fullCode);
  const confidence: ConfidenceLabel = "근거 미확인";

  return {
    standardType,
    codeType,
    ...(specialtyType ? { specialtyType } : {}),
    code: formatStandardCode(codeType, apiCode),
    apiCode,
    ...(fullCode ? { fullCode } : {}),
    name,
    ...(version ? { version } : {}),
    ...(updateDate ? { updateDate } : {}),
    sourceUrl: buildSourceUrl(codeType, apiCode),
    parentPath,
    confidence,
    reason: []
  };
}

export function toDocument(item: KcscViewerItem, fallbackType: StandardCodeType, fallbackApiCode: string): StandardDocument {
  const codeType = normalizeCodeType(item.codeType) ?? fallbackType;
  const apiCode = typeof item.code === "string" ? item.code : fallbackApiCode;
  const reportedName = typeof item.name === "string" && item.name.trim().length > 0 ? item.name : undefined;
  const name = reportedName ?? formatStandardCode(codeType, apiCode);
  const specialtyType = getSpecialtyType(codeType);
  const sections = [...(item.list ?? [])].map(toSection).sort((a, b) => a.sort - b.sort);
  const fullCode = nullToUndefined(item.fullCode);
  const version = nullToUndefined(item.version);
  const updateDate = nullToUndefined(item.updateDate);
  const evidenceGaps = [
    ...(reportedName ? [] : ["기준명"]),
    ...(version ?? updateDate ? [] : ["개정일/update date"])
  ];
  const hasBodyText = sections.some((section) => section.text.length > 0 && section.text !== "내용 없음");

  return {
    standardType: standardTypeFromCodeType(codeType),
    codeType,
    ...(specialtyType ? { specialtyType } : {}),
    code: formatStandardCode(codeType, apiCode),
    apiCode,
    ...(fullCode ? { fullCode } : {}),
    name,
    ...(version ? { version } : {}),
    ...(updateDate ? { updateDate } : {}),
    sourceUrl: buildSourceUrl(codeType, apiCode),
    parentPath: [],
    sections,
    confidence: documentConfidence(hasBodyText, evidenceGaps.length === 0),
    evidenceGaps
  };
}

function documentConfidence(hasBodyText: boolean, provenanceComplete: boolean): ConfidenceLabel {
  if (!hasBodyText) {
    return "근거 미확인";
  }
  return provenanceComplete ? "원문 직접 근거" : "관련 조항 추론";
}

function toSection(section: KcscViewerSection): StandardSection {
  const sort = typeof section.sort === "number" ? section.sort : Number.parseInt(String(section.sort ?? "0"), 10);
  const title = section.title ?? "";
  const label = section.label ?? "본문";
  const html = section.contents ?? "";
  const parsedLevel = section.level === undefined || section.level === null ? undefined : Number.parseInt(String(section.level), 10);
  const levelPart = parsedLevel !== undefined && Number.isFinite(parsedLevel) ? { level: parsedLevel } : {};

  return {
    sort: Number.isFinite(sort) ? sort : 0,
    title,
    ...levelPart,
    label,
    html,
    text: normalizeHtml(html)
  };
}

function matchesFilters(summary: StandardSummary, input: SearchStandardInput): boolean {
  const standardType = input.standardType ?? "all";
  if (standardType !== "all") {
    if (standardType === "specialty") {
      if (summary.standardType !== "specialty") {
        return false;
      }
    } else if (summary.codeType !== standardType) {
      return false;
    }
  }

  if (input.specialtyType && input.specialtyType !== "all_specialty" && summary.specialtyType !== input.specialtyType) {
    return false;
  }

  return true;
}

function scoreSummary(
  summary: StandardSummary,
  exactCode: ReturnType<typeof parseStandardCode>,
  queryTerms: readonly string[],
  projectTerms: readonly string[],
  workTerms: readonly string[]
): { readonly summary: StandardSummary; readonly score: number } {
  let score = 0;
  const reason: string[] = [];
  const haystack = [summary.code, summary.apiCode, summary.name, ...summary.parentPath].join(" ").toLowerCase();

  if (exactCode && summary.codeType === exactCode.type && summary.apiCode === exactCode.apiCode) {
    score += 1000;
    reason.push(`정확한 기준코드 일치: ${summary.code}`);
  }

  for (const term of queryTerms) {
    if (haystack.includes(term.toLowerCase())) {
      score += 10;
      reason.push(`검색어 일치: ${term}`);
    }
  }

  for (const term of projectTerms) {
    if (haystack.includes(term.toLowerCase())) {
      score += 4;
      reason.push(`프로젝트 분류 키워드 일치: ${term}`);
    }
  }

  for (const term of workTerms) {
    if (haystack.includes(term.toLowerCase())) {
      score += 3;
      reason.push(`공종 분류 키워드 일치: ${term}`);
    }
  }

  return { summary: { ...summary, reason }, score };
}

function tokenize(input: string): readonly string[] {
  return input
    .replace(/[()\[\]{}"']/g, " ")
    .split(/[\s,，·/]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

function normalizeCodeType(value: string | null | undefined): StandardCodeType | null {
  if (!value) {
    return null;
  }
  const upper = value.toUpperCase();
  return isSupportedCodeType(upper) ? upper : null;
}

function getSpecialtyType(codeType: StandardCodeType): SpecialtyType | undefined {
  return SPECIALTY_TYPES.includes(codeType as SpecialtyType) ? (codeType as SpecialtyType) : undefined;
}

function parentPathFrom(value: readonly KcscParentCode[] | string | null | undefined): readonly string[] {
  if (typeof value === "string") {
    return value
      .split(/[>\\/|]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((parent) => parent.name ?? parent.fullCode ?? "").filter((part) => part.length > 0);
}

function nullToUndefined(value: string | null | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function buildSourceUrl(codeType: string, apiCode: string): string {
  return `https://kcsc.re.kr/OpenApi/CodeViewer/${encodeURIComponent(codeType)}/${encodeURIComponent(apiCode)}`;
}
