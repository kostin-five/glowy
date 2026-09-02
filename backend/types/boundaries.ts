export type UnknownRecord = Record<string, unknown>;

export const isUnknownRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getErrorCode = (error: unknown): string | undefined => {
  if (!isUnknownRecord(error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
};

export const getErrorName = (error: unknown): string =>
  error instanceof Error ? error.name : "UnknownError";
