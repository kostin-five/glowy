// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MindHubDraft } from "../api/AiApi";

const legacyMessage = {
  id: 1,
  role: "assistant",
  text: "С чего начнём?",
};

const draft: MindHubDraft = {
  title: "Подготовить доклад",
  date: "2026-08-13",
  priority: "⚡️ P2",
  category: "Учеба",
  completed: false,
  energyLevel: "med",
  subtasks: [],
};

const loadStore = async () => {
  vi.resetModules();
  return import("./useMindHubStore");
};

const accountScope = "user:1";
const getConversation = <Store extends {
  getState: () => {
    conversationsByAccount: Record<
      string,
      { messages: unknown[]; pendingDrafts: unknown[] }
    >;
  };
}>(store: Store) => store.getState().conversationsByAccount[accountScope];

beforeEach(() => {
  localStorage.clear();
});

describe("useMindHubStore", () => {
  it("migrates valid messages from the previous local history", async () => {
    localStorage.setItem(
      "glowy-mind-hub-chat",
      JSON.stringify([legacyMessage, { role: "broken" }])
    );

    const { useMindHubStore } = await loadStore();
    useMindHubStore.getState().claimLegacyConversation(accountScope);

    expect(getConversation(useMindHubStore).messages).toEqual([legacyMessage]);
    expect(localStorage.getItem("glowy-mind-hub-chat")).toBeNull();
  });

  it("drops invalid persisted messages and drafts", async () => {
    localStorage.setItem(
      "glowy-mind-hub-conversation",
      JSON.stringify({
        state: {
          messages: [legacyMessage, { id: "wrong", role: "user", text: 4 }],
          pendingDrafts: [
            { ...draft, localId: "draft-1" },
            { title: "", localId: 12 },
          ],
        },
        version: 1,
      })
    );

    const { useMindHubStore } = await loadStore();
    useMindHubStore.getState().claimLegacyConversation(accountScope);

    expect(getConversation(useMindHubStore).messages).toEqual([legacyMessage]);
    expect(getConversation(useMindHubStore).pendingDrafts).toEqual([
      expect.objectContaining({ localId: "draft-1", title: draft.title }),
    ]);
  });

  it("keeps valid optional message metadata and drops only invalid metadata", async () => {
    localStorage.setItem(
      "glowy-mind-hub-conversation",
      JSON.stringify({
        state: {
          messages: [
            {
              ...legacyMessage,
              createdAt: "2026-09-03T08:15:00.000Z",
              linkedTask: { id: 42, title: "  Подготовить доклад  " },
            },
            {
              id: 2,
              role: "user",
              text: "Продолжим",
              createdAt: "wrong",
              linkedTask: { id: 0, title: "" },
            },
          ],
          pendingDrafts: [],
        },
        version: 1,
      })
    );

    const { useMindHubStore } = await loadStore();
    useMindHubStore.getState().claimLegacyConversation(accountScope);

    expect(getConversation(useMindHubStore).messages).toEqual([
      {
        ...legacyMessage,
        createdAt: "2026-09-03T08:15:00.000Z",
        linkedTask: { id: 42, title: "Подготовить доклад" },
      },
      { id: 2, role: "user", text: "Продолжим" },
    ]);
  });

  it("adds a creation time to new local messages", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-03T12:30:00.000Z"));
    const { useMindHubStore } = await loadStore();

    useMindHubStore.getState().appendMessage(accountScope, {
      role: "assistant",
      text: "Готово",
      linkedTask: { id: 7, title: "Проверить результат" },
    });

    expect(getConversation(useMindHubStore).messages[0]).toEqual(
      expect.objectContaining({
        role: "assistant",
        text: "Готово",
        createdAt: "2026-09-03T12:30:00.000Z",
        linkedTask: { id: 7, title: "Проверить результат" },
      })
    );
    vi.useRealTimers();
  });

  it("adds and removes pending drafts without creating tasks", async () => {
    const { useMindHubStore } = await loadStore();
    const store = useMindHubStore.getState();

    store.addDrafts(accountScope, [draft]);
    const [pending] = getConversation(useMindHubStore).pendingDrafts as Array<
      { localId: string }
    >;

    expect(pending).toEqual(expect.objectContaining(draft));
    expect(pending.localId).toEqual(expect.any(String));

    useMindHubStore.getState().removeDraft(accountScope, pending.localId);
    expect(getConversation(useMindHubStore).pendingDrafts).toEqual([]);
  });

  it("persists edits to an existing pending draft", async () => {
    const { useMindHubStore } = await loadStore();
    useMindHubStore.getState().addDrafts(accountScope, [draft]);
    const [pending] = getConversation(useMindHubStore).pendingDrafts as Array<
      { localId: string }
    >;

    useMindHubStore.getState().updateDraft(accountScope, pending.localId, {
      ...draft,
      priority: "💤 P3",
      energyLevel: "high",
      subtasks: [
        { title: "Найти источники", completed: false, position: 8 },
      ],
    });

    expect(getConversation(useMindHubStore).pendingDrafts[0]).toEqual(
      expect.objectContaining({
        localId: pending.localId,
        priority: "💤 P3",
        energyLevel: "high",
        subtasks: [
          { title: "Найти источники", completed: false, position: 0 },
        ],
      })
    );
  });

  it("clears messages and pending drafts together", async () => {
    const { useMindHubStore } = await loadStore();

    useMindHubStore.getState().appendMessage(accountScope, {
      role: "user",
      text: "Помоги разобраться",
    });
    useMindHubStore.getState().addDrafts(accountScope, [draft]);
    useMindHubStore.getState().clearConversation(accountScope);

    expect(getConversation(useMindHubStore).messages).toEqual([]);
    expect(getConversation(useMindHubStore).pendingDrafts).toEqual([]);
  });

  it("isolates conversations between accounts on the same device", async () => {
    const { useMindHubStore } = await loadStore();

    useMindHubStore.getState().appendMessage("user:1", {
      role: "user",
      text: "Личный план первого пользователя",
    });
    useMindHubStore.getState().appendMessage("user:2", {
      role: "user",
      text: "Личный план второго пользователя",
    });

    expect(
      useMindHubStore.getState().conversationsByAccount["user:1"].messages
    ).toEqual([
      expect.objectContaining({ text: "Личный план первого пользователя" }),
    ]);
    expect(
      useMindHubStore.getState().conversationsByAccount["user:2"].messages
    ).toEqual([
      expect.objectContaining({ text: "Личный план второго пользователя" }),
    ]);

    const reloaded = await loadStore();
    expect(
      reloaded.useMindHubStore.getState().conversationsByAccount["user:1"]
        .messages
    ).toEqual([
      expect.objectContaining({ text: "Личный план первого пользователя" }),
    ]);
    expect(
      reloaded.useMindHubStore.getState().conversationsByAccount["user:2"]
        .messages
    ).toEqual([
      expect.objectContaining({ text: "Личный план второго пользователя" }),
    ]);
  });
});
