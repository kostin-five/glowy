import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MindHubDraft, MindHubExchange } from "../api/AiApi";
import { normalizeTaskDate } from "../utils/taskDateGroups";

export type MindHubChatMessage = {
  id: number | string;
  role: "user" | "assistant";
  text: string;
};

export type PendingMindHubDraft = MindHubDraft & {
  localId: string;
};

interface MindHubStore {
  ownerKey: string | null;
  messages: MindHubChatMessage[];
  pendingDrafts: PendingMindHubDraft[];
  appendMessage: (message: Omit<MindHubChatMessage, "id">) => void;
  addDrafts: (drafts: MindHubDraft[]) => void;
  updateDraft: (localId: string, draft: MindHubDraft) => void;
  replaceServerConversation: (exchanges: MindHubExchange[]) => void;
  prependServerHistory: (exchanges: MindHubExchange[]) => void;
  setConversationOwner: (ownerKey: string) => void;
  removeDraft: (localId: string) => void;
  clearConversation: () => void;
}

const LEGACY_HISTORY_KEY = "glowy-mind-hub-chat";
const STORE_KEY = "glowy-mind-hub-conversation";

const normalizeMessages = (value: unknown): MindHubChatMessage[] =>
  Array.isArray(value)
    ? value.filter(
        (message): message is MindHubChatMessage =>
          (Number.isFinite(message?.id) || typeof message?.id === "string") &&
          (message?.role === "user" || message?.role === "assistant") &&
          typeof message?.text === "string"
      )
    : [];

const normalizeDraft = (value: unknown): PendingMindHubDraft | null => {
  if (!value || typeof value !== "object") return null;

  const draft = value as Partial<PendingMindHubDraft>;
  const title = typeof draft.title === "string" ? draft.title.trim() : "";
  const localId =
    typeof draft.localId === "string" ? draft.localId.trim() : "";

  if (!title || !localId) return null;

  return {
    localId,
    title,
    date: normalizeTaskDate(draft.date),
    priority: ["🔥 P1", "⚡️ P2", "💤 P3"].includes(draft.priority ?? "")
      ? draft.priority!
      : "⚡️ P2",
    category:
      typeof draft.category === "string" && draft.category.trim()
        ? draft.category.trim()
        : "Быт",
    completed: false,
    energyLevel: ["low", "med", "high"].includes(draft.energyLevel ?? "")
      ? draft.energyLevel!
      : "med",
    subtasks: Array.isArray(draft.subtasks)
      ? draft.subtasks
          .map((subtask, index) => ({
            title:
              typeof subtask?.title === "string" ? subtask.title.trim() : "",
            completed: false,
            position: index,
          }))
          .filter((subtask) => subtask.title.length > 0)
      : [],
  };
};

const normalizeDrafts = (value: unknown): PendingMindHubDraft[] =>
  Array.isArray(value)
    ? value
        .map(normalizeDraft)
        .filter((draft): draft is PendingMindHubDraft => draft !== null)
    : [];

const loadLegacyMessages = (): MindHubChatMessage[] => {
  if (typeof localStorage === "undefined") return [];

  try {
    const messages = normalizeMessages(
      JSON.parse(localStorage.getItem(LEGACY_HISTORY_KEY) ?? "[]")
    );
    localStorage.removeItem(LEGACY_HISTORY_KEY);
    return messages;
  } catch {
    return [];
  }
};

let localSequence = 0;

const createLocalId = (prefix: string) => {
  localSequence += 1;
  return `${prefix}-${Date.now()}-${localSequence}`;
};

const flattenExchanges = (exchanges: MindHubExchange[]) =>
  exchanges.flatMap((exchange) => [exchange.userMessage, exchange.assistantMessage]);

const deduplicateMessages = (messages: MindHubChatMessage[]) => {
  const seen = new Set<number | string>();
  return messages.filter((message) => {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
};

export const useMindHubStore = create<MindHubStore>()(
  persist(
    (set) => ({
      ownerKey: null,
      messages: loadLegacyMessages(),
      pendingDrafts: [],
      appendMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            { ...message, id: Date.now() + state.messages.length + localSequence++ },
          ],
        })),
      addDrafts: (drafts) =>
        set((state) => ({
          pendingDrafts: [
            ...state.pendingDrafts,
            ...drafts.map((draft) => ({
              ...draft,
              subtasks: draft.subtasks.map((subtask) => ({ ...subtask })),
              localId: createLocalId("draft"),
            })),
          ],
        })),
      updateDraft: (localId, draft) =>
        set((state) => ({
          pendingDrafts: state.pendingDrafts.map((pendingDraft) =>
            pendingDraft.localId === localId
              ? {
                  ...draft,
                  localId,
                  subtasks: draft.subtasks.map((subtask, position) => ({
                    ...subtask,
                    position,
                  })),
                }
              : pendingDraft
          ),
        })),
      replaceServerConversation: (exchanges) => set((state) => ({
        messages: deduplicateMessages(
          normalizeMessages(flattenExchanges(exchanges))
        ),
        pendingDrafts: state.pendingDrafts,
      })),
      prependServerHistory: (exchanges) => set((state) => ({
        messages: deduplicateMessages([
          ...normalizeMessages(flattenExchanges(exchanges)),
          ...state.messages,
        ]),
        pendingDrafts: state.pendingDrafts,
      })),
      setConversationOwner: (ownerKey) =>
        set((state) =>
          state.ownerKey && state.ownerKey !== ownerKey
            ? { ownerKey, messages: [], pendingDrafts: [] }
            : { ownerKey }
        ),
      removeDraft: (localId) =>
        set((state) => ({
          pendingDrafts: state.pendingDrafts.filter(
            (draft) => draft.localId !== localId
          ),
        })),
      clearConversation: () => set({ messages: [], pendingDrafts: [] }),
    }),
    {
      name: STORE_KEY,
      version: 1,
      partialize: ({ ownerKey, messages, pendingDrafts }) => ({
        ownerKey,
        messages,
        pendingDrafts,
      }),
      merge: (persisted, current) => {
        const state =
          persisted && typeof persisted === "object"
            ? (persisted as Partial<MindHubStore>)
            : {};

        return {
          ...current,
          ownerKey:
            typeof state.ownerKey === "string" ? state.ownerKey : null,
          messages:
            state.messages === undefined
              ? current.messages
              : normalizeMessages(state.messages),
          pendingDrafts:
            state.pendingDrafts === undefined
              ? current.pendingDrafts
              : normalizeDrafts(state.pendingDrafts),
        };
      },
    }
  )
);

export const useMindHubMessages = () =>
  useMindHubStore((state) => state.messages);

export const usePendingMindHubDrafts = () =>
  useMindHubStore((state) => state.pendingDrafts);
