import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MindHubDraft } from "../api/AiApi";
import { normalizeTaskDate } from "../utils/taskDateGroups";

export type MindHubChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  createdAt?: string;
  linkedTask?: {
    id: number;
    title: string;
  };
};

export type PendingMindHubDraft = MindHubDraft & {
  localId: string;
};

type MindHubConversation = {
  messages: MindHubChatMessage[];
  pendingDrafts: PendingMindHubDraft[];
};

interface MindHubStore {
  conversationsByAccount: Record<string, MindHubConversation>;
  legacyConversation: MindHubConversation | null;
  claimLegacyConversation: (accountScope: string) => void;
  appendMessage: (
    accountScope: string,
    message: Omit<MindHubChatMessage, "id">
  ) => void;
  addDrafts: (accountScope: string, drafts: MindHubDraft[]) => void;
  updateDraft: (
    accountScope: string,
    localId: string,
    draft: MindHubDraft
  ) => void;
  removeDraft: (accountScope: string, localId: string) => void;
  clearConversation: (accountScope: string) => void;
}

const LEGACY_HISTORY_KEY = "glowy-mind-hub-chat";
const STORE_KEY = "glowy-mind-hub-conversation";

const normalizeMessages = (value: unknown): MindHubChatMessage[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];

    const message = candidate as Partial<MindHubChatMessage>;
    const id = message.id;
    if (
      typeof id !== "number" ||
      !Number.isFinite(id) ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.text !== "string"
    ) {
      return [];
    }

    const createdAt =
      typeof message.createdAt === "string" &&
      !Number.isNaN(new Date(message.createdAt).getTime())
        ? message.createdAt
        : undefined;
    const linkedTask =
      message.linkedTask &&
      Number.isFinite(message.linkedTask.id) &&
      message.linkedTask.id !== 0 &&
      typeof message.linkedTask.title === "string" &&
      message.linkedTask.title.trim()
        ? {
            id: message.linkedTask.id,
            title: message.linkedTask.title.trim(),
          }
        : undefined;

    return [
      {
        id,
        role: message.role,
        text: message.text,
        ...(createdAt ? { createdAt } : {}),
        ...(linkedTask ? { linkedTask } : {}),
      },
    ];
  });
};

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

const EMPTY_CONVERSATION: MindHubConversation = {
  messages: [],
  pendingDrafts: [],
};

const normalizeConversation = (value: unknown): MindHubConversation => {
  if (!value || typeof value !== "object") return EMPTY_CONVERSATION;

  const conversation = value as Partial<MindHubConversation>;
  return {
    messages: normalizeMessages(conversation.messages),
    pendingDrafts: normalizeDrafts(conversation.pendingDrafts),
  };
};

const normalizeConversationMap = (
  value: unknown
): Record<string, MindHubConversation> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([scope]) => scope.trim().length > 0)
      .map(([scope, conversation]) => [scope, normalizeConversation(conversation)])
  );
};

const getConversation = (state: MindHubStore, accountScope: string) =>
  state.conversationsByAccount[accountScope] ??
  state.legacyConversation ??
  EMPTY_CONVERSATION;

const updateConversation = (
  state: MindHubStore,
  accountScope: string,
  update: (conversation: MindHubConversation) => MindHubConversation
) => ({
  conversationsByAccount: {
    ...state.conversationsByAccount,
    [accountScope]: update(getConversation(state, accountScope)),
  },
  legacyConversation: null,
});

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
      conversationsByAccount: {},
      legacyConversation: {
        messages: loadLegacyMessages(),
        pendingDrafts: [],
      },
      claimLegacyConversation: (accountScope) =>
        set((state) => {
          if (!state.legacyConversation) return state;
          if (state.conversationsByAccount[accountScope]) {
            return { legacyConversation: null };
          }

          return {
            conversationsByAccount: {
              ...state.conversationsByAccount,
              [accountScope]: state.legacyConversation,
            },
            legacyConversation: null,
          };
        }),
      appendMessage: (accountScope, message) =>
        set((state) =>
          updateConversation(state, accountScope, (conversation) => ({
            ...conversation,
            messages: [
              ...conversation.messages,
              {
                ...message,
                createdAt: message.createdAt ?? new Date().toISOString(),
                id:
                  Date.now() +
                  conversation.messages.length +
                  localSequence++,
              },
            ],
          }))
        ),
      addDrafts: (accountScope, drafts) =>
        set((state) =>
          updateConversation(state, accountScope, (conversation) => ({
            ...conversation,
            pendingDrafts: [
              ...conversation.pendingDrafts,
              ...drafts.map((draft) => ({
                ...draft,
                subtasks: draft.subtasks.map((subtask) => ({ ...subtask })),
                localId: createLocalId("draft"),
              })),
            ],
          }))
        ),
      updateDraft: (accountScope, localId, draft) =>
        set((state) =>
          updateConversation(state, accountScope, (conversation) => ({
            ...conversation,
            pendingDrafts: conversation.pendingDrafts.map((pendingDraft) =>
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
          }))
        ),
      removeDraft: (accountScope, localId) =>
        set((state) =>
          updateConversation(state, accountScope, (conversation) => ({
            ...conversation,
            pendingDrafts: conversation.pendingDrafts.filter(
              (draft) => draft.localId !== localId
            ),
          }))
        ),
      clearConversation: (accountScope) =>
        set((state) =>
          updateConversation(state, accountScope, () => EMPTY_CONVERSATION)
        ),
    }),
    {
      name: STORE_KEY,
      version: 2,
      partialize: ({ conversationsByAccount, legacyConversation }) => ({
        conversationsByAccount,
        legacyConversation,
      }),
      migrate: (persistedState, version) => {
        if (version >= 2) return persistedState;

        const legacy = persistedState as Partial<MindHubConversation>;
        return {
          conversationsByAccount: {},
          legacyConversation: normalizeConversation(legacy),
        };
      },
      merge: (persisted, current) => {
        const state =
          persisted && typeof persisted === "object"
            ? (persisted as Partial<MindHubStore>)
            : {};

        return {
          ...current,
          conversationsByAccount: normalizeConversationMap(
            state.conversationsByAccount
          ),
          legacyConversation:
            state.legacyConversation === null
              ? null
              : normalizeConversation(
                  state.legacyConversation ?? current.legacyConversation
                ),
        };
      },
    }
  )
);

export const useMindHubMessages = (accountScope: string) =>
  useMindHubStore((state) => getConversation(state, accountScope).messages);

export const usePendingMindHubDrafts = (accountScope: string) =>
  useMindHubStore(
    (state) => getConversation(state, accountScope).pendingDrafts
  );
