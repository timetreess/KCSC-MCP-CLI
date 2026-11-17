import { z } from "zod";
import { PROJECT_TYPES, SPECIALTY_TYPE_FILTERS, STANDARD_TYPE_FILTERS, WORK_TYPES, type ProjectType, type SearchStandardInput, type SpecialtyTypeFilter, type StandardTypeFilter, type WorkType } from "../api/kcsc-types.js";

export const standardTypeSchema = z.enum(STANDARD_TYPE_FILTERS);
export const specialtyTypeSchema = z.enum(SPECIALTY_TYPE_FILTERS);
export const projectTypeSchema = z.enum(PROJECT_TYPES);
export const workTypeSchema = z.enum(WORK_TYPES);

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function parseStandardTypeFilter(value: string | undefined): StandardTypeFilter | undefined {
  return parseOptionalEnum(value, STANDARD_TYPE_FILTERS, "standard type");
}

export function parseSpecialtyTypeFilter(value: string | undefined): SpecialtyTypeFilter | undefined {
  return parseOptionalEnum(value, SPECIALTY_TYPE_FILTERS, "specialty type");
}

export function parseProjectType(value: string | undefined): ProjectType | undefined {
  return parseOptionalEnum(value, PROJECT_TYPES, "project type");
}

export function parseWorkType(value: string | undefined): WorkType | undefined {
  return parseOptionalEnum(value, WORK_TYPES, "work type");
}

export function parseLimit(value: string | undefined, maximum: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const limit = Number.parseInt(value, 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > maximum) {
    throw new ValidationError(`Invalid limit: ${value}. Expected an integer from 1 to ${maximum}.`);
  }
  return limit;
}

export function buildSearchInputFromOptions(query: string, options: Readonly<Record<string, string>>, maximumLimit = 50): SearchStandardInput {
  const standardType = parseStandardTypeFilter(options.type);
  const specialtyType = parseSpecialtyTypeFilter(options.specialty);
  const projectType = parseProjectType(options.project);
  const workType = parseWorkType(options.work);
  const limit = parseLimit(options.limit, maximumLimit);

  return {
    query,
    ...(standardType ? { standardType } : {}),
    ...(specialtyType ? { specialtyType } : {}),
    ...(projectType ? { projectType } : {}),
    ...(workType ? { workType } : {}),
    ...(limit ? { limit } : {})
  };
}

function parseOptionalEnum<T extends string>(value: string | undefined, values: readonly T[], label: string): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isEnumValue(values, value)) {
    throw new ValidationError(`Invalid ${label}: ${value}.`);
  }
  return value;
}

function isEnumValue<T extends string>(values: readonly T[], value: string): value is T {
  return values.some((candidate) => candidate === value);
}
