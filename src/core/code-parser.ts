import type { StandardCodeType } from "../api/kcsc-types.js";

export interface ParsedStandardCode {
  readonly type: StandardCodeType;
  readonly apiCode: string;
  readonly formatted: string;
}

const SUPPORTED_TYPES: readonly StandardCodeType[] = [
  "KDS",
  "KCS",
  "EXCS",
  "KRACS",
  "KRCCS",
  "KWCS",
  "LHCS",
  "NHCS",
  "SMCS"
];

export function isSupportedCodeType(value: string): value is StandardCodeType {
  return SUPPORTED_TYPES.includes(value as StandardCodeType);
}

export function parseStandardCode(input: string): ParsedStandardCode | null {
  const normalized = input.trim().toUpperCase();
  const typeMatch = normalized.match(/^([A-Z]+)\s*[-_]?\s*(.*)$/);
  if (!typeMatch) {
    return null;
  }

  const maybeType = typeMatch[1];
  const remainder = typeMatch[2] ?? "";
  if (!maybeType || !isSupportedCodeType(maybeType)) {
    return null;
  }

  const digits = remainder.replace(/[-_\s]/g, "");
  if (!/^\d{6}$/.test(digits)) {
    return null;
  }

  return {
    type: maybeType,
    apiCode: digits,
    formatted: formatStandardCode(maybeType, digits)
  };
}

export function formatStandardCode(type: StandardCodeType | string, apiCode: string): string {
  if (!/^\d{6}$/.test(apiCode)) {
    return `${type} ${apiCode}`;
  }

  return `${type} ${apiCode.slice(0, 2)} ${apiCode.slice(2, 4)} ${apiCode.slice(4, 6)}`;
}

export function standardTypeFromCodeType(codeType: string): "KDS" | "KCS" | "specialty" {
  if (codeType === "KDS" || codeType === "KCS") {
    return codeType;
  }
  return "specialty";
}
