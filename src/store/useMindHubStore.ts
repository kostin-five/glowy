import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MindHubDraft } from "../api/AiApi";
import { normalizeTaskDate } from "../utils/taskDateGroups";

export type MindHubChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

export type PendingMindHubDraft = MindHubDraft & {
  localId: string;
};

interface MindHubStore {
  messages: MindHubChatMessage[];
  pendingDrafts: PendingMindHubDraft[];
  appendMessage: (message: Omit<MindHubChatMessage, "id">) => void;
  addDrafts: (drafts: MindHubDraft[]) => void;
  removeDraft: (localId: string) => void;
  clearConversation: () => void;
}

const LEGACY_HISTORY_KEY = "glowy-mind-hub-chat";
const STORE_KEY = "glowy-mind-hub-conversation";

const normalizeMessages = (value: unknown): MindHubChatMessage[] =>
  Array.isArray(value)
    ? value.filter(
        (message): message is MindHubChatMessage =>
          Number.isFinite(message?.id) &&
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

export const useMindHubStore = create<MindHubStore>()(
  persist(
    (set) => ({
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
      partialize: ({ messages, pendingDrafts }) => ({
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
