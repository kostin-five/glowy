import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function mergeIdReferences(
  ...references: Array<string | undefined>
) {
  const ids = [...new Set(references.flatMap((reference) => reference?.split(" ") ?? []))]
    .filter(Boolean)
    .join(" ");

  return ids || undefined;
}

export const focusRingClassName = "foundation-token-focus";
