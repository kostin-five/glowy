export const DEFAULT_AVATAR_ID = "orbit-indigo";

export const AVATAR_IDS = Object.freeze([
  "orbit-indigo",
  "orbit-mint",
  "orbit-coral",
  "orbit-sun",
  "orbit-sky",
  "orbit-rose",
]);

export const AI_TONES = Object.freeze(["calm", "moderate", "strict"]);

export const isKnownAvatarId = (value) =>
  value === null || AVATAR_IDS.includes(value);

export const isKnownAiTone = (value) => AI_TONES.includes(value);
