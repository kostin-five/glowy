import { describe, expect, it } from "vitest";
import {
  getLevelByXp,
  getLevelProgress,
  getLevelThreshold,
  getXpReward,
} from "./xp";

describe("getXpReward", () => {
  it("uses energy level as the base reward", () => {
    expect(getXpReward("low", "💤 P3")).toBe(10);
    expect(getXpReward("med", "💤 P3")).toBe(20);
    expect(getXpReward("high", "💤 P3")).toBe(30);
  });

  it("applies priority as a multiplier, not as the base reward", () => {
    expect(getXpReward("low", "🔥 P1")).toBe(15);
    expect(getXpReward("med", "⚡️ P2")).toBe(24);
    expect(getXpReward("high", "💤 P3")).toBe(30);
  });

  it("rounds fractional rewards for high-energy priority tasks", () => {
    expect(getXpReward("high", "🔥 P1")).toBe(45);
    expect(getXpReward("high", "⚡️ P2")).toBe(36);
  });

  it("falls back to low energy and P3 multiplier for unknown values", () => {
    expect(getXpReward("unknown", "unknown")).toBe(10);
    expect(getXpReward(undefined, undefined)).toBe(10);
  });
});

describe("level progression", () => {
  it("returns configured thresholds for early levels", () => {
    expect(getLevelThreshold(1)).toBe(0);
    expect(getLevelThreshold(2)).toBe(50);
    expect(getLevelThreshold(6)).toBe(1000);
    expect(getLevelThreshold(14)).toBe(10000);
  });

  it("continues levels after level 14 by adding 2500 XP each time", () => {
    expect(getLevelThreshold(15)).toBe(12500);
    expect(getLevelThreshold(16)).toBe(15000);
  });

  it("calculates the current level from total XP", () => {
    expect(getLevelByXp(0)).toBe(1);
    expect(getLevelByXp(49)).toBe(1);
    expect(getLevelByXp(50)).toBe(2);
    expect(getLevelByXp(10000)).toBe(14);
    expect(getLevelByXp(12500)).toBe(15);
  });

  it("calculates progress inside the current level", () => {
    expect(getLevelProgress(75, 2)).toEqual({
      levelStartXP: 50,
      nextLevelXP: 100,
      earnedInsideLevel: 25,
      requiredInsideLevel: 50,
      progressPercent: 50,
    });
  });

  it("clamps progress to 100% for XP above the next threshold", () => {
    expect(getLevelProgress(200, 2).progressPercent).toBe(100);
  });
});
