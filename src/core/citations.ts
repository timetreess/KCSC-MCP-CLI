import type { CitationMatch, CitationVerification, KcscListItem, StandardCodeType, StandardSummary } from "../api/kcsc-types.js";
import { formatStandardCode, isSupportedCodeType, parseStandardCode } from "./code-parser.js";
import { toSummary } from "./standards.js";

const CITATION_PATTERN = /\b(KDS|KCS|EXCS|KRACS|KRCCS|KWCS|LHCS|NHCS|SMCS)\s*[-_]?\s*(\d{2})\s*[-_]?\s*(\d{2})\s*[-_]?\s*(\d{2})\b/gi;

export function extractCitations(text: string): readonly CitationMatch[] {
  const seen = new Set<string>();
  const matches: CitationMatch[] = [];

  for (const match of text.matchAll(CITATION_PATTERN)) {
    const raw = match[0];
    const codeType = match[1]?.toUpperCase();
    const apiCode = `${match[2] ?? ""}${match[3] ?? ""}${match[4] ?? ""}`;
    if (!codeType || !isSupportedCodeType(codeType) || !parseStandardCode(`${codeType} ${apiCode}`)) {
      continue;
    }

    const key = `${codeType}:${apiCode}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    matches.push({
      raw,
      code: formatStandardCode(codeType, apiCode),
      apiCode,
      codeType,
      normalized: formatStandardCode(codeType, apiCode)
    });
  }

  return matches;
}

export function verifyCitations(text: string, metadata: readonly KcscListItem[]): readonly CitationVerification[] {
  const summaries = new Map<string, StandardSummary>();
  for (const item of metadata) {
    const summary = toSummary(item);
    if (summary) {
      summaries.set(`${summary.codeType}:${summary.apiCode}`, summary);
    }
  }

  return extractCitations(text).map((citation) => {
    const standard = summaries.get(`${citation.codeType}:${citation.apiCode}`);
    return {
      ...citation,
      exists: standard !== undefined,
      ...(standard ? { standard } : {}),
      message: standard
        ? `${citation.normalized} exists in current KCSC metadata.`
        : `${citation.normalized} was not found in current KCSC metadata. Check formatting, contract documents, and expanded search scope.`
    };
  });
}

export function normalizeCitationCodeType(value: string): StandardCodeType | null {
  const upper = value.toUpperCase();
  return isSupportedCodeType(upper) ? upper : null;
}
