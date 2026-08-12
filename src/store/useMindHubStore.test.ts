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

    expect(useMindHubStore.getState().messages).toEqual([legacyMessage]);
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

    expect(useMindHubStore.getState().messages).toEqual([legacyMessage]);
    expect(useMindHubStore.getState().pendingDrafts).toEqual([
      expect.objectContaining({ localId: "draft-1", title: draft.title }),
    ]);
  });

  it("adds and removes pending drafts without creating tasks", async () => {
    const { useMindHubStore } = await loadStore();
    const store = useMindHubStore.getState();

    store.addDrafts([draft]);
    const [pending] = useMindHubStore.getState().pendingDrafts;

    expect(pending).toEqual(expect.objectContaining(draft));
    expect(pending.localId).toEqual(expect.any(String));

    useMindHubStore.getState().removeDraft(pending.localId);
    expect(useMindHubStore.getState().pendingDrafts).toEqual([]);
  });

  it("persists edits to an existing pending draft", async () => {
    const { useMindHubStore } = await loadStore();
    useMindHubStore.getState().addDrafts([draft]);
    const [pending] = useMindHubStore.getState().pendingDrafts;

    useMindHubStore.getState().updateDraft(pending.localId, {
      ...draft,
      priority: "💤 P3",
      energyLevel: "high",
      subtasks: [
        { title: "Найти источники", completed: false, position: 8 },
      ],
    });

    expect(useMindHubStore.getState().pendingDrafts[0]).toEqual(
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

    useMindHubStore.getState().appendMessage({
      role: "user",
      text: "Помоги разобраться",
    });
    useMindHubStore.getState().addDrafts([draft]);
    useMindHubStore.getState().clearConversation();

    expect(useMindHubStore.getState().messages).toEqual([]);
    expect(useMindHubStore.getState().pendingDrafts).toEqual([]);
  });

  it("replaces messages with server exchanges and preserves local drafts", async () => {
    const { useMindHubStore } = await loadStore();
    useMindHubStore.getState().appendMessage({ role: "user", text: "Локально" });
    useMindHubStore.getState().addDrafts([draft]);
    useMindHubStore.getState().replaceServerConversation([{
      id: 5,
      userMessage: { id: "5-user", role: "user", text: "С сервера" },
      assistantMessage: { id: "5-assistant", role: "assistant", text: "Ответ" },
      createdAt: "2026-08-12T00:00:00.000Z",
    }]);

    expect(useMindHubStore.getState().messages.map((message) => message.text)).toEqual(["С сервера", "Ответ"]);
    expect(useMindHubStore.getState().pendingDrafts[0]).toEqual(
      expect.objectContaining({ title: draft.title, localId: expect.any(String) })
    );
  });

  it("clears cached conversation when the account owner changes", async () => {
    const { useMindHubStore } = await loadStore();
    useMindHubStore.getState().setConversationOwner("account:first@example.com");
    useMindHubStore.getState().appendMessage({ role: "user", text: "Личное" });
    useMindHubStore.getState().addDrafts([draft]);

    useMindHubStore.getState().setConversationOwner("account:second@example.com");

    expect(useMindHubStore.getState().ownerKey).toBe("account:second@example.com");
    expect(useMindHubStore.getState().messages).toEqual([]);
    expect(useMindHubStore.getState().pendingDrafts).toEqual([]);
  });

  it("deduplicates repeated server messages while prepending history", async () => {
    const { useMindHubStore } = await loadStore();
    const exchange = {
      id: 5,
      userMessage: { id: "5-user", role: "user" as const, text: "С сервера" },
      assistantMessage: { id: "5-assistant", role: "assistant" as const, text: "Ответ" },
      createdAt: "2026-08-12T00:00:00.000Z",
    };

    useMindHubStore.getState().replaceServerConversation([exchange]);
    useMindHubStore.getState().prependServerHistory([exchange]);

    expect(useMindHubStore.getState().messages.map((message) => message.id)).toEqual([
      "5-user",
      "5-assistant",
    ]);
  });
});
