import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTaskAnalysisPrompt,
  buildToneInstruction,
} from "../services/ai/mind-hub.service.js";

test("behavior modes have clearly different instructions and shared safety", () => {
  const calm = buildToneInstruction("calm");
  const moderate = buildToneInstruction("moderate");
  const instruction = buildToneInstruction("strict");

  assert.match(calm, /поддержи/i);
  assert.match(calm, /небольшой/i);
  assert.match(moderate, /без утешений/i);
  assert.match(moderate, /факт/i);
  assert.match(instruction, /невыполн/i);
  assert.match(instruction, /решени/i);
  assert.match(instruction, /не унижай/i);
  assert.match(instruction, /не стыди/i);
  assert.match(instruction, /не угрожай/i);
  assert.notEqual(calm, moderate);
  assert.notEqual(moderate, instruction);
});

test("unknown tone falls back to calm and keeps Glowy masculine", () => {
  assert.equal(buildToneInstruction("unknown"), buildToneInstruction("calm"));

  const prompt = buildTaskAnalysisPrompt("- Пример", 50, "moderate");
  assert.match(prompt, /мужском роде/i);
  assert.match(prompt, /нейтрально/i);
  assert.doesNotMatch(prompt, /понимающим другом/i);
  assert.doesNotMatch(prompt, /т[её]плый/i);
});
