const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isDateOnly = (value: unknown): value is string => {
  if (typeof value !== "string" || !DATE_ONLY_PATTERN.test(value)) return false;

  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

export const parsePositiveId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export type OptionalMinutesResult =
  | { valid: true; value: number | null | undefined }
  | { valid: false; value: null };

export const normalizeOptionalMinutes = (value: unknown): OptionalMinutesResult => {
  if (value === undefined) return { valid: true, value: undefined };
  if (value === null || value === "") return { valid: true, value: null };

  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    return { valid: false, value: null };
  }

  return { valid: true, value: minutes };
};

export const compareDateOnly = (left: string, right: string): number =>
  left.localeCompare(right);

export const addDaysToDateOnly = (value: unknown, days: unknown): string | null => {
  if (
    !isDateOnly(value) ||
    typeof days !== "number" ||
    !Number.isInteger(days)
  ) {
    return null;
  }

  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};
