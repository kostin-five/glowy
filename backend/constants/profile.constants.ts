export const DEFAULT_AVATAR_ID = "orbit-indigo";

export const AVATAR_IDS = [
  "orbit-indigo",
  "orbit-mint",
  "orbit-coral",
  "orbit-sun",
  "orbit-sky",
  "orbit-rose",
] as const;

export const AI_TONES = ["calm", "moderate", "strict"] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];
export type AiTone = (typeof AI_TONES)[number];

export const isKnownAvatarId = (value: unknown): value is AvatarId | null =>
  value === null ||
  (typeof value === "string" && (AVATAR_IDS as readonly string[]).includes(value));

export const isKnownAiTone = (value: unknown): value is AiTone =>
  typeof value === "string" && (AI_TONES as readonly string[]).includes(value);
