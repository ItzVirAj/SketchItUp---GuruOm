import { z } from 'zod';
import {
  CommandCentreGranularity,
  CommandCentreRange,
} from './command-centre.types';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const rawCommandCentreQuerySchema = z.object({
  from: z.string().regex(ISO_DATE_PATTERN, 'must be an ISO calendar date (YYYY-MM-DD)').optional(),
  to: z.string().regex(ISO_DATE_PATTERN, 'must be an ISO calendar date (YYYY-MM-DD)').optional(),
  compareFrom: z.string().regex(ISO_DATE_PATTERN, 'must be an ISO calendar date (YYYY-MM-DD)').optional(),
  compareTo: z.string().regex(ISO_DATE_PATTERN, 'must be an ISO calendar date (YYYY-MM-DD)').optional(),
  granularity: z.enum(['day', 'week', 'month']).optional(),
});

export type CommandCentreQueryInput = z.input<typeof rawCommandCentreQuerySchema>;

export class CommandCentreQueryValidationError extends Error {
  public readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join('; '));
    this.name = 'CommandCentreQueryValidationError';
    this.issues = issues;
  }
}

function isValidCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function dateToIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToIso(date);
}

function daysBetweenInclusive(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00.000Z`).getTime();
  const end = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.round((end - start) / 86_400_000) + 1;
}

function assertDateOrder(from: string, to: string, field: string, issues: string[]): void {
  if (from > to) {
    issues.push(`${field}: must be on or before its end date`);
  }
}

export function parseCommandCentreQuery(
  input: unknown,
  now: Date = new Date(),
): CommandCentreRange {
  const parsed = rawCommandCentreQuerySchema.safeParse(input);
  if (!parsed.success) {
    throw new CommandCentreQueryValidationError(
      parsed.error.issues.map((issue) => `${issue.path.join('.') || 'query'}: ${issue.message}`),
    );
  }

  const raw = parsed.data;
  const today = dateToIso(now);
  const to = raw.to ?? today;
  const from = raw.from ?? addDays(to, -29);
  const selectedCompareFrom = raw.compareFrom;
  const selectedCompareTo = raw.compareTo;
  const hasCompareFrom = selectedCompareFrom !== undefined;
  const hasCompareTo = selectedCompareTo !== undefined;
  const issues: string[] = [];

  for (const [field, value] of [
    ['from', from],
    ['to', to],
    ['compareFrom', selectedCompareFrom],
    ['compareTo', selectedCompareTo],
  ] as const) {
    if (value !== undefined && !isValidCalendarDate(value)) {
      issues.push(`${field}: is not a valid calendar date`);
    }
  }

  if (issues.length > 0) {
    throw new CommandCentreQueryValidationError(issues);
  }

  if (to > today) {
    issues.push('to: cannot be in the future');
  }
  assertDateOrder(from, to, 'range', issues);

  const selectedDays = daysBetweenInclusive(from, to);
  if (selectedDays > 366) {
    issues.push('range: may not exceed 366 days');
  }

  if (hasCompareFrom !== hasCompareTo) {
    issues.push('compareFrom and compareTo: must be supplied together');
  }

  const compareFrom = selectedCompareFrom ?? addDays(from, -selectedDays);
  const compareTo = selectedCompareTo ?? addDays(from, -1);
  assertDateOrder(compareFrom, compareTo, 'comparison range', issues);

  if (compareTo > today) {
    issues.push('compareTo: cannot be in the future');
  }

  const compareDays = daysBetweenInclusive(compareFrom, compareTo);
  if (compareDays > 366) {
    issues.push('comparison range: may not exceed 366 days');
  }
  if (compareDays !== selectedDays) {
    issues.push('comparison range: must have the same number of days as the selected range');
  }

  if (issues.length > 0) {
    throw new CommandCentreQueryValidationError(issues);
  }

  const granularity: CommandCentreGranularity = raw.granularity ?? 'day';
  return {
    from,
    to,
    compareFrom,
    compareTo,
    granularity,
  };
}
