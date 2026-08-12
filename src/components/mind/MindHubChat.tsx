import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MutableRefObject,
} from "react";
import axios from "axios";
import {
  Check,
  Copy,
  Info,
  Mic,
  Send,
  Sparkles,
  Square,
  X,
  Trash2,
} from "lucide-react";
import AiApi, {
  type MindHubDraft,
  type MindHubLimit,
  type MindHubMessage,
  type MindHubMode,
} from "../../api/AiApi";
import type { Task } from "../../types";
import { useTaskStore } from "../../store/useTaskStore";
import { trackProductEvent } from "../../utils/analytics";
import useTypewriter from "../../hooks/useTypewriter";
import useNetworkStatus from "../../hooks/useNetworkStatus";
import MindHubDraftCard from "./MindHubDraftCard";
import {
  GUEST_REQUEST_LIMIT,
  useGuestRequestsCount,
  useGuestRequestsResetDate,
  useIsGuest,
} from "../../store/useAuthStore";
import {
  type MindHubChatMessage,
  useMindHubMessages,
  useMindHubStore,
  usePendingMindHubDrafts,
} from "../../store/useMindHubStore";

const WELCOME_MESSAGE =
  "Выгрузи мысли или вопросы. Я отвечу и предложу черновик задачи — сохранять решаешь ты.";
const VOICE_SILENCE_TIMEOUT_MS = 7_000;

interface MindHubChatProps {
  inputRef?: MutableRefObject<HTMLTextAreaElement | null>;
  variant?: "dashboard" | "quick" | "page";
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
  if (typeof window === "undefined") return null;

  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
};

const joinVoiceText = (...parts: string[]) =>
  parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

interface ChatMessageBubbleProps {
  message: MindHubChatMessage;
  shouldType: boolean;
  onTypeComplete: (messageId: number) => void;
  onTextUpdate: () => void;
}

const ChatMessageBubble = ({
  message,
  shouldType,
  onTypeComplete,
  onTextUpdate,
}: ChatMessageBubbleProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { displayedText: typedText, isTyping } = useTypewriter(
    shouldType ? message.text : "",
    38
  );
  const displayedText = shouldType ? typedText : message.text;

  useEffect(() => {
    if (!shouldType) return;
    onTextUpdate();

    if (!isTyping && displayedText === message.text) {
      onTypeComplete(message.id);
    }
  }, [
    displayedText,
    isTyping,
    message.id,
    message.text,
    onTextUpdate,
    onTypeComplete,
    shouldType,
  ]);

  const handleCopy = async () => {
    if (!message.text.trim()) return;

    try {
      await navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy chat message:", error);
    }
  };

  return (
    <div
      className={`group flex flex-col ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
          message.role === "user"
            ? "self-end bg-indigo-600 text-white rounded-br-md"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-100 dark:shadow-none"
        }`}
      >
        {displayedText}
        {shouldType && displayedText.length < message.text.length && (
          <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-indigo-300" />
        )}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className={`mt-1 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 opacity-70 transition-all hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
          message.role === "user" ? "self-end" : "self-start"
        } ${isCopied ? "text-emerald-500 dark:text-emerald-300" : ""}`}
        aria-label={isCopied ? "Сообщение скопировано" : "Скопировать сообщение"}
        title={isCopied ? "Скопировано" : "Скопировать"}
      >
        {isCopied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
};

const saveAiCreatedTaskIds = (tasks: Task[]) => {
  try {
    const saved = JSON.parse(
      localStorage.getItem("glowy-ai-created-task-ids") || "[]"
    );
    const previousIds = Array.isArray(saved)
      ? saved.filter((id): id is number => typeof id === "number")
      : [];
    const newIds = tasks.map((task) => task.id);
    const updatedIds = Array.from(new Set([...newIds, ...previousIds])).slice(
      0,
      20
    );

    localStorage.setItem(
      "glowy-ai-created-task-ids",
      JSON.stringify(updatedIds)
    );
    window.dispatchEvent(new Event("glowy-ai-created-task-ids-updated"));
  } catch (error) {
    console.error("Failed to save AI-created task ids", error);
  }
};

const MindHubChat = ({ inputRef, variant = "dashboard" }: MindHubChatProps) => {
  const hubMode: MindHubMode = "auto";
  const messages = useMindHubMessages();
  const pendingDrafts = usePendingMindHubDrafts();
  const appendMessage = useMindHubStore((state) => state.appendMessage);
  const addDrafts = useMindHubStore((state) => state.addDrafts);
  const removeDraft = useMindHubStore((state) => state.removeDraft);
  const clearConversation = useMindHubStore(
    (state) => state.clearConversation
  );
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceInputError, setVoiceInputError] = useState<string | null>(null);
  const [typedMessageIds, setTypedMessageIds] = useState<Set<number>>(() => {
    return new Set(
      useMindHubStore
        .getState()
        .messages.filter((message) => message.role === "assistant")
        .map((message) => message.id)
    );
  });
  const [isPromptHelpOpen, setIsPromptHelpOpen] = useState(false);
  const [registeredAiLimit, setRegisteredAiLimit] =
    useState<MindHubLimit | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceSilenceTimeoutRef = useRef<number | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const voiceBaseTextRef = useRef("");
  const voiceAccumulatedTextRef = useRef("");
  const voiceSessionFinalTextRef = useRef("");
  const voiceSessionInterimTextRef = useRef("");
  const isOnline = useNetworkStatus();
  const isGuest = useIsGuest();
  const guestRequestsCount = useGuestRequestsCount();
  const guestRequestsResetDate = useGuestRequestsResetDate();

  const guestAiLimit = useMemo<MindHubLimit | null>(() => {
    if (!isGuest || !guestRequestsResetDate) return null;

    return {
      limit: GUEST_REQUEST_LIMIT,
      remaining: Math.max(0, GUEST_REQUEST_LIMIT - guestRequestsCount),
      resetAt: new Date(
        new Date(guestRequestsResetDate).getTime() + 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  }, [guestRequestsCount, guestRequestsResetDate, isGuest]);

  const activeAiLimit = isGuest ? guestAiLimit : registeredAiLimit;
  const shouldShowAiLimit =
    Boolean(activeAiLimit) && (activeAiLimit?.remaining ?? 0) <= 5;

  const isNearChatBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;

    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceToBottom < 48;
  }, []);

  const handleMessagesScroll = useCallback(() => {
    shouldAutoScrollRef.current = isNearChatBottom();
  }, [isNearChatBottom]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!shouldAutoScrollRef.current) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages.length, isSending, scrollToBottom]);

  useEffect(() => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      160
    )}px`;
  }, [text]);

  const clearVoiceSilenceTimeout = useCallback(() => {
    if (voiceSilenceTimeoutRef.current === null) return;

    window.clearTimeout(voiceSilenceTimeoutRef.current);
    voiceSilenceTimeoutRef.current = null;
  }, []);

  const scheduleVoiceSilencePause = useCallback(() => {
    clearVoiceSilenceTimeout();
    voiceSilenceTimeoutRef.current = window.setTimeout(() => {
      shouldKeepListeningRef.current = false;
      speechRecognitionRef.current?.stop();
    }, VOICE_SILENCE_TIMEOUT_MS);
  }, [clearVoiceSilenceTimeout]);

  useEffect(
    () => () => {
      shouldKeepListeningRef.current = false;
      clearVoiceSilenceTimeout();
      const recognition = speechRecognitionRef.current;
      if (!recognition) return;

      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    },
    [clearVoiceSilenceTimeout]
  );

  const handleVoiceInput = () => {
    if (isListening && speechRecognitionRef.current) {
      shouldKeepListeningRef.current = false;
      clearVoiceSilenceTimeout();
      speechRecognitionRef.current.stop();
      return;
    }

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setVoiceInputError(
        "Голосовой ввод не поддерживается в этом браузере."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const finalParts: string[] = [];
      const interimParts: string[] = [];

      if (shouldKeepListeningRef.current) {
        scheduleVoiceSilencePause();
      }

      for (let index = 0; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        const target = event.results[index].isFinal ? finalParts : interimParts;
        target.push(transcript);
      }

      voiceSessionFinalTextRef.current = joinVoiceText(...finalParts);
      voiceSessionInterimTextRef.current = joinVoiceText(...interimParts);

      setText(
        joinVoiceText(
          voiceBaseTextRef.current,
          voiceAccumulatedTextRef.current,
          voiceSessionFinalTextRef.current,
          voiceSessionInterimTextRef.current
        )
      );
      setVoiceInputError(null);
      window.requestAnimationFrame(() => textareaRef.current?.focus());
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;

      shouldKeepListeningRef.current = false;
      clearVoiceSilenceTimeout();
      if (speechRecognitionRef.current === recognition) {
        speechRecognitionRef.current = null;
        setIsListening(false);
      }
      setVoiceInputError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Разреши доступ к микрофону, чтобы использовать голосовой ввод."
          : "Не удалось распознать речь. Попробуй ещё раз."
      );
    };
    recognition.onend = () => {
      if (speechRecognitionRef.current !== recognition) return;

      if (shouldKeepListeningRef.current) {
        voiceAccumulatedTextRef.current = joinVoiceText(
          voiceAccumulatedTextRef.current,
          voiceSessionFinalTextRef.current,
          voiceSessionInterimTextRef.current
        );
        voiceSessionFinalTextRef.current = "";
        voiceSessionInterimTextRef.current = "";

        try {
          recognition.start();
          return;
        } catch {
          shouldKeepListeningRef.current = false;
          clearVoiceSilenceTimeout();
          setVoiceInputError(
            "Не удалось продолжить голосовой ввод. Попробуй ещё раз."
          );
        }
      }

      clearVoiceSilenceTimeout();
      speechRecognitionRef.current = null;
      setIsListening(false);
    };

    speechRecognitionRef.current = recognition;
    shouldKeepListeningRef.current = true;
    voiceBaseTextRef.current = text;
    voiceAccumulatedTextRef.current = "";
    voiceSessionFinalTextRef.current = "";
    voiceSessionInterimTextRef.current = "";
    setVoiceInputError(null);
    setIsListening(true);

    try {
      recognition.start();
      scheduleVoiceSilencePause();
    } catch {
      shouldKeepListeningRef.current = false;
      clearVoiceSilenceTimeout();
      speechRecognitionRef.current = null;
      setIsListening(false);
      setVoiceInputError("Не удалось запустить голосовой ввод. Попробуй ещё раз.");
    }
  };

  const handleTypeComplete = useCallback((messageId: number) => {
    setTypedMessageIds((current) => new Set(current).add(messageId));
  }, []);

  const latestAssistantMessageId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")?.id;

  const setTextareaRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (inputRef) inputRef.current = node;
    },
    [inputRef]
  );

  const dismissDraft = (localId: string) => {
    removeDraft(localId);
  };

  const confirmDraft = async (
    localId: string,
    draft: MindHubDraft
  ): Promise<void> => {
    const createdTask = await useTaskStore.getState().createTask(draft);

    if (!createdTask) {
      throw new Error("Не удалось сохранить задачу. Попробуй ещё раз.");
    }

    saveAiCreatedTaskIds([createdTask]);
    dismissDraft(localId);
    trackProductEvent("ai_draft_confirmed");
    appendMessage({
      role: "assistant",
      text: `Задача «${createdTask.title}» сохранена.`,
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const message = text.trim();
    if (!message || isSending || isListening || !isOnline) return;

    const userMessage: MindHubChatMessage = {
      id: Date.now() + messages.length,
      role: "user",
      text: message,
    };
    const requestMessages: MindHubMessage[] = [...messages, userMessage].map(
      ({ role, text }) => ({
        role,
        text,
      })
    );

    shouldAutoScrollRef.current = true;
    appendMessage({ role: userMessage.role, text: userMessage.text });
    setText("");
    setIsSending(true);

    try {
      const result = await AiApi.parseMindHub(
        message,
        hubMode,
        requestMessages
      );
      setRegisteredAiLimit(result.limit ?? null);

      appendMessage({
        role: "assistant",
        text:
          result.reply ||
          "Я рядом. Можешь продолжить мысль, и мы спокойно разберём её вместе.",
      });

      if (result.drafts.length > 0) {
        addDrafts(result.drafts);
      }
    } catch (error) {
      console.error(error);
      const serverError =
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : null;

      appendMessage({
        role: "assistant",
        text:
          serverError ||
          "Не получилось обработать сообщение. Попробуй отправить ещё раз.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const sectionClassName =
    variant === "quick"
      ? "flex h-[min(72dvh,44rem)] min-h-0 flex-col overflow-hidden bg-white dark:bg-slate-900"
      : variant === "page"
        ? "flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-slate-900"
        : "flex h-[min(760px,calc(100svh-6rem))] min-h-128 max-h-[760px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none xl:h-[calc(100vh-12rem)] xl:min-h-160 xl:max-h-none";

  return (
    <section className={sectionClassName}>
      {variant !== "quick" && (
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-300" />
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {variant === "page" ? "Glowy AI" : "Разгрузка мыслей"}
              </h2>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearConversation();
                  setTypedMessageIds(new Set());
                }}
                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                title="Очистить историю"
                aria-label="Очистить историю"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            {WELCOME_MESSAGE}
          </p>
        </div>
      )}

      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className={`mind-hub-scrollbar flex-1 overflow-y-auto bg-slate-100/60 dark:bg-slate-950/35 ${
          variant === "quick" ? "px-4 py-4" : "px-5 py-5"
        }`}
      >
        <div className="flex flex-col gap-3">
          {!messages.length && (
            <ChatMessageBubble
              message={{
                id: 0,
                role: "assistant",
                text: WELCOME_MESSAGE,
              }}
              shouldType={false}
              onTypeComplete={handleTypeComplete}
              onTextUpdate={() => scrollToBottom("auto")}
            />
          )}

          {messages.map((message) => {
            const shouldType =
              message.role === "assistant" &&
              message.id === latestAssistantMessageId &&
              !typedMessageIds.has(message.id);

            return (
              <ChatMessageBubble
                key={message.id}
                message={message}
                shouldType={shouldType}
                onTypeComplete={handleTypeComplete}
                onTextUpdate={() => scrollToBottom("auto")}
              />
            );
          })}

          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-300 dark:shadow-none">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-300" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-300 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-300 [animation-delay:240ms]" />
                </span>
              </div>
            </div>
          )}

          {pendingDrafts.map((draft) => (
            <MindHubDraftCard
              key={draft.localId}
              draft={draft}
              onDismiss={() => dismissDraft(draft.localId)}
              onConfirm={(editedDraft) =>
                confirmDraft(draft.localId, editedDraft)
              }
            />
          ))}

        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900/95"
      >
        {!isOnline && (
          <div className="mb-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-200">
            Нет подключения к интернету. Разгрузка мыслей временно недоступна.
          </div>
        )}
        <div className="relative mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Пиши свободно — обычный вопрос останется разговором, а задачу я сначала покажу как черновик.
          </p>
          <button
            type="button"
            title="Как писать запросы?"
            onClick={() => setIsPromptHelpOpen((current) => !current)}
            className="ml-3 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition-colors hover:bg-slate-300 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            aria-expanded={isPromptHelpOpen}
            aria-label="Как писать запросы?"
          >
            <Info size={15} />
          </button>

          {isPromptHelpOpen && (
            <div className="absolute bottom-full right-0 z-20 mb-3 w-[min(20rem,calc(100vw-4rem))] rounded-2xl border border-slate-700/70 bg-slate-950 p-3 text-xs leading-5 text-slate-200 shadow-2xl shadow-slate-950/40">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-100">Подсказка для ИИ</p>
                <button
                  type="button"
                  onClick={() => setIsPromptHelpOpen(false)}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
                  aria-label="Закрыть подсказку"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="mb-2 text-slate-300">
                Можно написать: «я устал и не понимаю, с чего начать», «надо купить продукты и ответить преподу», «срочно сделать курсач: сначала источники, потом введение».
              </p>
              <p className="mb-2 text-slate-300">
                Напиши детали прямо в фразе:
              </p>
              <ul className="space-y-1.5 text-slate-300">
                <li>
                  <span className="font-semibold text-indigo-200">
                    Категория:
                  </span>{" "}
                  «по учебе», «для дома».
                </li>
                <li>
                  <span className="font-semibold text-indigo-200">
                    Приоритет:
                  </span>{" "}
                  «срочно», «до завтра».
                </li>
                <li>
                  <span className="font-semibold text-indigo-200">
                    Энергия:
                  </span>{" "}
                  «много сил», «быстро».
                </li>
                <li>
                  <span className="font-semibold text-indigo-200">
                    Подзадачи:
                  </span>{" "}
                  «сначала..., потом...».
                </li>
              </ul>
              <div className="mt-3 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-2.5 text-slate-200">
                «Срочно сделать курсач по учебе, много сил. Сначала собрать
                источники, потом написать введение.»
              </div>
            </div>
          )}
        </div>
        {shouldShowAiLimit && activeAiLimit && (
          <p
            className={`mb-3 rounded-xl border px-3 py-2 text-center text-xs font-medium ${
              activeAiLimit.remaining === 0
                ? "border-rose-400/30 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                : "border-indigo-400/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
            }`}
          >
            {activeAiLimit.remaining === 0
              ? `Лимит запросов исчерпан. Восстановится в ${formatLimitResetTime(
                  activeAiLimit.resetAt
                )}.`
              : `Осталось ${activeAiLimit.remaining} ${getRequestWord(
                  activeAiLimit.remaining
                )} к ИИ сегодня.`}
          </p>
        )}
        <div
          className={`flex items-end gap-3 rounded-2xl border p-3 shadow-sm transition-colors dark:shadow-none ${
            isOnline
              ? "border-slate-200 bg-white focus-within:border-indigo-500 dark:border-slate-700 dark:bg-slate-950/50"
              : "cursor-not-allowed border-amber-400/30 bg-amber-50/80 dark:bg-amber-400/5"
          }`}
        >
          <textarea
            ref={setTextareaRefs}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            placeholder={
              !isOnline
                ? "Ввод заблокирован до восстановления подключения..."
                : "Например: я устал, надо ответить преподу и купить продукты..."
            }
            className={`custom-scrollbar max-h-40 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-6 outline-none ${
              isOnline
                ? "text-slate-900 placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-500"
                : "cursor-not-allowed text-slate-500 placeholder:text-amber-700/80 dark:text-slate-500 dark:placeholder:text-amber-200/70"
            }`}
            readOnly={isListening}
            disabled={isSending || !isOnline}
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            disabled={isSending || (!isOnline && !isListening)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              isListening
                ? "animate-pulse bg-rose-500 text-white hover:bg-rose-400"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
            aria-label={
              isListening ? "Остановить голосовой ввод" : "Начать голосовой ввод"
            }
            aria-pressed={isListening}
            title={isListening ? "Остановить запись" : "Голосовой ввод"}
          >
            {isListening ? <Square size={16} /> : <Mic size={18} />}
          </button>
          <button
            type="submit"
            disabled={!text.trim() || isSending || isListening || !isOnline}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Отправить мысли"
          >
            <Send size={18} />
          </button>
        </div>
        {voiceInputError && (
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-300" role="status">
            {voiceInputError}
          </p>
        )}
      </form>
    </section>
  );
};

const formatLimitResetTime = (resetAt: string | null) => {
  if (!resetAt) return "ближайшее время";

  const resetDate = new Date(resetAt);
  if (Number.isNaN(resetDate.getTime())) return "ближайшее время";

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(resetDate);
};

const getRequestWord = (count: number) => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastDigit === 1 && lastTwoDigits !== 11) return "запрос";
  if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits)) {
    return "запроса";
  }

  return "запросов";
};

export default MindHubChat;
