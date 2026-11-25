// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { useTaskStore } from "../store/useTaskStore";
import { NoteApi } from "../api/NoteApi";
import { ProgressApi } from "../api/ProgressApi";
import { AnalyticsApi } from "../api/AnalyticsApi";
import AiApi from "../api/AiApi";
import { demoSchema, demoTransaction } from "./demoStorage";
import { DemoProgress } from "./demoProgress";
import type { Task } from "../types";

// Minimal transactional test double. Browser persistence/concurrency is also
// exercised with real IndexedDB in the desktop/mobile Playwright suite.
const installDatabase = () => {
  const control = { stored: undefined as unknown, failWrite: false };
  const database = {
    createObjectStore: vi.fn(), close: vi.fn(),
    transaction: () => {
      let pending: unknown;
      let put = false;
      let aborted = false;
      const transaction = {
        oncomplete: null as null | (() => void), onabort: null as null | (() => void), onerror: null as null | (() => void),
        abort: () => { aborted = true; queueMicrotask(() => transaction.onabort?.()); },
        objectStore: () => ({
          get: () => {
            const request = { result: structuredClone(control.stored), onsuccess: null as null | (() => void) };
            queueMicrotask(() => {
              request.onsuccess?.();
              if (aborted) return;
              if (put && control.failWrite) { transaction.abort(); return; }
              if (put) control.stored = structuredClone(pending);
              transaction.oncomplete?.();
            });
            return request;
          },
          put: (value: unknown) => { pending = value; put = true; },
        }),
      };
      return transaction;
    },
  };
  vi.stubGlobal("indexedDB", {
    open: () => {
      const request = { result: database, onsuccess: null as null | (() => void), onupgradeneeded: null as null | (() => void) };
      queueMicrotask(() => { request.onupgradeneeded?.(); request.onsuccess?.(); });
      return request;
    },
  });
  return control;
};
const task = (id: number, completedOn: string | null = null): Task => ({ id, title: `Локальная задача ${id}`, completed: Boolean(completedOn), completedOn, date: "", energyLevel: "low", priority: "💤 P3", category: "", xpAwarded: Boolean(completedOn), estimatedMinutes: 15, actualMinutes: 10, subtasks: [] });
let database: ReturnType<typeof installDatabase>;
let network: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ isGuest: false, userId: null, token: null });
  useAuthStore.getState().toDemoLogin();
  useTaskStore.setState({ tasks: [task(1)], currentXP: 0, userLevel: 1 });
  database = installDatabase();
  network = vi.spyOn(axios.Axios.prototype, "request").mockRejectedValue(new Error("Unexpected network request"));
});
afterEach(() => { expect(network).not.toHaveBeenCalled(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("local demo data and boundaries", () => {
  it("persists notes, validates fields, searches and restores archives", async () => {
    const note = await NoteApi.create({ title: " Мысль ", content: "Спокойный шаг" });
    expect(note.title).toBe("Мысль");
    expect(await NoteApi.list("ШАГ")).toHaveLength(1);
    await NoteApi.update(note.id, { content: "Новая мысль", archived: true });
    expect(await NoteApi.list()).toHaveLength(0);
    expect(await NoteApi.list("", true)).toHaveLength(1);
    await NoteApi.update(note.id, { archived: false });
    expect((await NoteApi.get(note.id)).content).toBe("Новая мысль");
    await expect(NoteApi.create({ title: "", content: " " })).rejects.toThrow();
    await expect(NoteApi.update(note.id, { title: "x".repeat(201) })).rejects.toThrow();
    await expect(NoteApi.create({ title: "x", content: "x".repeat(50001) })).rejects.toThrow();
    await NoteApi.deleteLocal(note.id);
    await expect(NoteApi.get(note.id)).rejects.toThrow("не найдена");
  });
  it("keeps unique links and removes them when a task is deleted", async () => {
    const note = await NoteApi.create({ title: "Связь", content: "" });
    await NoteApi.linkTask(note.id, 1); await NoteApi.linkTask(note.id, 1);
    expect((await NoteApi.get(note.id)).taskLinks).toHaveLength(1);
    await useTaskStore.getState().deleteTask(1);
    expect((await NoteApi.get(note.id)).taskLinks).toHaveLength(0);
    expect(demoSchema.parse(database.stored).notes[0].taskLinks).toHaveLength(0);
  });
  it("does not claim success or use an API fallback after a storage failure", async () => {
    const note = await NoteApi.create({ title: "Сохранённая", content: "" });
    database.failWrite = true;
    await expect(NoteApi.update(note.id, { title: "Не сохранена" })).rejects.toThrow("сохранить");
    database.failWrite = false;
    expect((await NoteApi.get(note.id)).title).toBe("Сохранённая");
  });
  it("reports corrupted data without overwriting it", async () => {
    database.stored = { version: 7, private: "synthetic fixture" };
    await expect(NoteApi.list()).rejects.toThrow("повреждены");
    expect(database.stored).toEqual({ version: 7, private: "synthetic fixture" });
  });
  it("rejects a late guest read even after guest → account → guest", async () => {
    const request = NoteApi.list();
    useAuthStore.getState().toLogin(7, "Тест", "test@example.com");
    useAuthStore.getState().toDemoLogin();
    await expect(request).rejects.toThrow("Контекст демо изменился");
  });
  it("preserves guest tasks and never combines them with account tasks", async () => {
    const note = await NoteApi.create({ title: "Гостевая", content: "" });
    useAuthStore.getState().toLogin(7, "Тест", "test@example.com");
    expect(useTaskStore.getState().tasks).toEqual([]);
    await expect(demoTransaction(() => undefined)).rejects.toThrow();
    useTaskStore.setState({ tasks: [task(99)], currentXP: 40, userLevel: 1 });
    useAuthStore.getState().toDemoLogin();
    expect(useTaskStore.getState().tasks.map((item) => item.id)).toEqual([1]);
    expect((await NoteApi.get(note.id)).title).toBe("Гостевая");
  });
  it("supports habit CRUD and unique daily checks", async () => {
    const habit = await ProgressApi.createHabit("Читать", "2026-10-07");
    await ProgressApi.setHabitCompleted(habit.id, "2026-10-06", true, "2026-10-07");
    await ProgressApi.setHabitCompleted(habit.id, "2026-10-07", true, "2026-10-07");
    const checked = await ProgressApi.setHabitCompleted(habit.id, "2026-10-07", true, "2026-10-07");
    expect(checked.checkDates).toHaveLength(2); expect(checked.currentStreak).toBe(2);
    await ProgressApi.updateHabit(habit.id, "Читать книгу", "2026-10-07");
    await ProgressApi.archiveHabit(habit.id, "2026-10-07");
    await expect(ProgressApi.setHabitCompleted(habit.id, "2026-10-07", true, "2026-10-07")).rejects.toThrow("архива");
    await ProgressApi.restoreHabit(habit.id, "2026-10-07");
    expect((await ProgressApi.getOverview("2026-10-07")).habits[0].title).toBe("Читать книгу");
    await ProgressApi.setHabitCompleted(habit.id, "2026-10-07", false, "2026-10-07");
    await ProgressApi.deleteHabit(habit.id);
    expect((await ProgressApi.getOverview("2026-10-07")).habits).toHaveLength(0);
  });
  it("calculates calendar, one-time achievements and idempotent XP", async () => {
    await useTaskStore.getState().toggleTask(1); const xp = useTaskStore.getState().currentXP;
    await useTaskStore.getState().toggleTask(1); await useTaskStore.getState().toggleTask(1);
    expect(useTaskStore.getState().currentXP).toBe(xp);
    useTaskStore.setState({ tasks: [task(1, "2026-09-30"), task(2, "2026-10-01"), task(3, "2026-10-02")] });
    const first = await ProgressApi.getOverview("2026-10-02", "2026-09");
    expect(first.taskStreak.current).toBe(3);
    expect(first.taskStreak.calendar?.days.length).toBeGreaterThanOrEqual(35);
    const earned = first.achievements.find((item) => item.key === "streak_3");
    useTaskStore.setState({ tasks: [] });
    expect((await ProgressApi.getOverview("2026-10-02")).achievements.find((item) => item.key === "streak_3")?.earnedAt).toBe(earned?.earnedAt);
    await expect(ProgressApi.getOverview("2026-10-02", "2026-11")).rejects.toThrow("месяц");
  });
  it("applies only eligible yesterday rescues with monthly and duplicate limits", async () => {
    useTaskStore.setState({ tasks: [task(1, "2026-10-05")] });
    await expect(ProgressApi.applyRescue("2026-10-05", "2026-10-07")).rejects.toThrow("вчерашний");
    const result = await ProgressApi.applyRescue("2026-10-06", "2026-10-07");
    expect(result.taskStreak.current).toBe(2); expect(result.rescues.remaining).toBe(2);
    await expect(ProgressApi.applyRescue("2026-10-06", "2026-10-07")).rejects.toThrow("защищён");
    await demoTransaction((data) => { data.rescues = ["2026-10-01", "2026-10-02", "2026-10-03"]; });
    await expect(ProgressApi.applyRescue("2026-10-06", "2026-10-07")).rejects.toThrow("закончились");
  });
  it("aggregates empty, weekly and monthly analytics from local completion dates", async () => {
    expect((await AnalyticsApi.getSnapshot("week", "2026-10-07")).hasActivity).toBe(false);
    useTaskStore.setState({ tasks: [task(1, "2026-10-06"), task(2, "2026-10-01")] });
    const week = await AnalyticsApi.getSnapshot("week", "2026-10-07");
    expect(week.completedTasks).toBe(1); expect(week.time.actualMinutes).toBe(10);
    expect(week.canRequestAiInsight).toBe(false);
    const month = await AnalyticsApi.getSnapshot("month", "2026-10-07");
    expect(month.completedTasks).toBe(2); expect(month.dailyCompleted).toHaveLength(31);
    expect(await DemoProgress.analytics(useTaskStore.getState(), "month", "2026-10-07")).toEqual(month);
  });
  it("blocks account-only AI clients before network without consuming quota", async () => {
    const before = useAuthStore.getState().guestRequestsCount;
    expect(await AiApi.getAiUsage()).toBeNull();
    expect(await AiApi.getAdvice()).toEqual({ message: "AI недоступен в демо-режиме" });
    await expect(AiApi.createSubtaskDraft({ title: "Тест", category: "", estimatedMinutes: null, existingSubtasks: [], energyLevel: "low", priority: "💤 P3" })).rejects.toThrow("AI недоступен");
    await expect(NoteApi.generateTaskDraft(1, "Тест")).rejects.toThrow("AI недоступен");
    await expect(NoteApi.confirmTask(1, { title: "Тест", date: "", category: "", completed: false, energyLevel: "low", priority: "💤 P3", subtasks: [] })).rejects.toThrow("AI недоступен");
    await expect(AnalyticsApi.requestInsight("week", "2026-10-07")).rejects.toThrow("AI недоступен");
    expect(useAuthStore.getState().guestRequestsCount).toBe(before);
  });
});
