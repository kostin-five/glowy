import { z } from "zod";
import { schemaHabit, schemaNote, schemaAvatarId } from "../types";
import { useAuthStore } from "../store/useAuthStore";

export const DEMO_AI_MESSAGE = "AI недоступен в демо-режиме";
export const assertAccountAi = () => {
  if (useAuthStore.getState().isGuest) throw new Error(DEMO_AI_MESSAGE);
};

// A generation, not just an owner id, also rejects late A → B → A responses.
let generation = 0;
useAuthStore.subscribe((next, previous) => {
  if (next.isGuest !== previous.isGuest || next.userId !== previous.userId || next.token !== previous.token) generation++;
});
export const captureDemoScope = () => {
  const captured = generation;
  const assert = () => {
    if (!useAuthStore.getState().isGuest || captured !== generation) throw new Error("Контекст демо изменился");
  };
  assert();
  return assert;
};

export const demoSchema = z.object({
  version: z.literal(1),
  nextId: z.number().int().positive(),
  notes: schemaNote.array(),
  habits: schemaHabit.array(),
  rescues: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).array(),
  awards: z.record(z.string(), z.string()),
  avatarId: schemaAvatarId.default("orbit-indigo"),
});
export type DemoData = z.infer<typeof demoSchema>;
const emptyData = (): DemoData => ({ version: 1, nextId: 1, notes: [], habits: [], rescues: [], awards: {}, avatarId: "orbit-indigo" });

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (typeof indexedDB === "undefined") return reject(new Error("Локальное хранилище недоступно"));
  const request = indexedDB.open("glowy-demo", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("guest");
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error("Не удалось открыть локальное хранилище"));
  request.onblocked = () => reject(new Error("Закрой другие вкладки Glowy и повтори сохранение"));
});

// Read and mutate in one transaction: simultaneous saves cannot lose each other.
export const demoTransaction = async <T>(operation: (data: DemoData) => T, write = true): Promise<T> => {
  const assertScope = captureDemoScope();
  const database = await openDatabase();
  try {
    assertScope();
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction("guest", write ? "readwrite" : "readonly");
      const store = transaction.objectStore("guest");
      const request = store.get("local-v1");
      let result: T;
      let failure: unknown;
      request.onsuccess = () => {
        try {
          assertScope();
          const parsed = demoSchema.safeParse(request.result ?? emptyData());
          if (!parsed.success) throw new Error("Данные демо повреждены. Экспортируй данные браузера перед очисткой хранилища.");
          result = operation(parsed.data);
          if (write) store.put(demoSchema.parse(parsed.data), "local-v1");
        } catch (error) { failure = error; transaction.abort(); }
      };
      transaction.oncomplete = () => {
        try { assertScope(); resolve(result); } catch (error) { reject(error); }
      };
      transaction.onabort = transaction.onerror = () => reject(failure ?? new Error("Не удалось сохранить данные на устройстве. Повтори действие."));
    });
  } finally { database.close(); }
};
