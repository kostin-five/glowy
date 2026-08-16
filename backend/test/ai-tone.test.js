import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTaskAnalysisPrompt,
  buildToneInstruction,
} from "../services/ai/mind-hub.service.js";

test("strict tone remains direct without humiliation or threats", () => {
  const instruction = buildToneInstruction("strict");

  assert.match(instruction, /строго/i);
  assert.match(instruction, /не унижай/i);
  assert.match(instruction, /не стыди/i);
  assert.match(instruction, /не угрожай/i);
});

test("unknown tone falls back to calm and keeps Glowy masculine", () => {
  assert.equal(buildToneInstruction("unknown"), buildToneInstruction("calm"));

  const prompt = buildTaskAnalysisPrompt("- Пример", 50, "moderate");
  assert.match(prompt, /мужском роде/i);
  assert.match(prompt, /Говори спокойно, но прямо/i);
});
