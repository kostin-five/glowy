import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MutableRefObject,
} from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Check,
  ArrowDown,
  ArrowRight,
  Copy,
  Info,
  Mic,
  Send,
  Sparkles,
  Square,
  X,
  Trash2,
  Plus,
  ListTodo,
} from "lucide-react";
import { openTaskCreateLauncher } from "../tasks/taskCreateLauncher";
import AiApi, {
  type MindHubDraft,
  type MindHubLimit,
  type MindHubMessage,
  type MindHubMode,
} from "../../api/AiApi";
import { useTaskStore } from "../../store/useTaskStore";
import { trackProductEvent } from "../../utils/analytics";
import useTypewriter from "../../hooks/useTypewriter";
import useNetworkStatus from "../../hooks/useNetworkStatus";
import MindHubDraftCard from "./MindHubDraftCard";
import {
  useIsGuest,
  useUserId,
} from "../../store/useAuthStore";
import {
  type MindHubChatMessage,
  useMindHubMessages,
  useMindHubStore,
  usePendingMindHubDrafts,
} from "../../store/useMindHubStore";

const VOICE_SILENCE_TIMEOUT_MS = 7_000;
const STARTER_PROMPTS = [
  {
    title: "Собрать план на день",
    description: "Выбрать главное и не перегрузить расписание",
    prompt:
      "Помоги собрать спокойный план на день: выбери три главных шага и объясни, с чего лучше начать.",
  },
  {
    title: "Разобрать перегруз",
    description: "Разложить мысли и найти один следующий шаг",
    prompt:
      "У меня накопилось слишком много дел. Помоги разобрать перегруз и выбрать один реалистичный следующий шаг.",
  },
  {
    title: "Подготовить задачу",
    description: "Превратить мысль в проверяемый черновик",
    prompt:
      "Помоги превратить мою мысль в понятную задачу с реалистичными подзадачами: ",
  },
] as const;

interface MindHubChatProps {
  inputRef?: MutableRefObject<HTMLTextAreaElement | null>;
  variant?: "dashboard" | "quick" | "page" | "drawer";
  onClose?: () => void;
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

const formatMessageTime = (createdAt?: string) => {
  if (!createdAt) return null;

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

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
  const messageTime = formatMessageTime(message.createdAt);

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
    } catch {
      console.error("CHAT_COPY_FAILED");
    }
  };

  return (
    <div
      className={`group flex flex-col ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`mb-1 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 ${
          message.role === "user" ? "self-end" : "self-start"
        }`}
      >
        <span>{message.role === "user" ? "Ты" : "Glowy"}</span>
        {messageTime && <time dateTime={message.createdAt}>{messageTime}</time>}
      </div>
      <div
        className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[85%] ${
          message.role === "user"
            ? "self-end bg-indigo-600 text-white rounded-br-md"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-100 dark:shadow-none"
        }`}
      >
        <p className="whitespace-pre-wrap">{displayedText}</p>
        {shouldType && displayedText.length < message.text.length && (
          <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-indigo-300" />
        )}
        {message.linkedTask && (
          <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-slate-900 dark:border-indigo-400/25 dark:bg-indigo-500/10 dark:text-slate-100">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <ListTodo size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                  Задача сохранена
                </p>
                <p className="truncate font-semibold">{message.linkedTask.title}</p>
              </div>
            </div>
            <Link
              to={`/tasks?task=${message.linkedTask.id}`}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-indigo-300 px-3 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-indigo-400/30 dark:text-indigo-200 dark:hover:bg-indigo-500/15"
            >
              Перейти к задачам
              <ArrowRight size={15} />
            </Link>
          </div>
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

const MindHubChat = ({ inputRef, variant = "dashboard", onClose }: MindHubChatProps) => {
  const hubMode: MindHubMode = "auto";
  const isGuest = useIsGuest();
  const userId = useUserId();
  const accountScope = userId !== null ? `user:${userId}` : isGuest ? "guest" : "anonymous";
  const messages = useMindHubMessages(accountScope);
  const pendingDrafts = usePendingMindHubDrafts(accountScope);
  const claimLegacyConversation = useMindHubStore(
    (state) => state.claimLegacyConversation
  );
  const appendMessage = useMindHubStore((state) => state.appendMessage);
  const addDrafts = useMindHubStore((state) => state.addDrafts);
  const updateDraft = useMindHubStore((state) => state.updateDraft);
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
      messages.filter((message) => message.role === "assistant")
        .map((message) => message.id)
    );
  });
  const [isPromptHelpOpen, setIsPromptHelpOpen] = useState(false);
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] =
    useState(false);
  const [isJumpToLatestVisible, setIsJumpToLatestVisible] = useState(false);
  const [receivedAiLimit, setReceivedAiLimit] =
    useState<{ scope: string; limit: MindHubLimit | null } | null>(null);
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
  const activeAiLimit = receivedAiLimit?.scope === accountScope ? receivedAiLimit.limit : null;
  const shouldShowAiLimit =
    Boolean(activeAiLimit) && (activeAiLimit?.remaining ?? 0) <= 5;

  useEffect(() => {
    claimLegacyConversation(accountScope);
  }, [accountScope, claimLegacyConversation]);

  const isNearChatBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;

    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceToBottom < 48;
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const isNearBottom = isNearChatBottom();
    shouldAutoScrollRef.current = isNearBottom;
    setIsJumpToLatestVisible(!isNearBottom);
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

  const jumpToLatest = useCallback(() => {
    shouldAutoScrollRef.current = true;
    setIsJumpToLatestVisible(false);
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
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

  const applyStarterPrompt = (prompt: string) => {
    setText((current) =>
      current.trim() ? `${current.trimEnd()}\n${prompt}` : prompt
    );
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const dismissDraft = (localId: string) => {
    removeDraft(accountScope, localId);
  };

  const confirmDraft = async (
    localId: string,
    draft: MindHubDraft
  ): Promise<void> => {
    const createdTask = await useTaskStore.getState().createTask(draft);

    if (!createdTask) {
      throw new Error("Не удалось сохранить задачу. Попробуй ещё раз.");
    }

    dismissDraft(localId);
    trackProductEvent("ai_draft_confirmed");
    appendMessage(accountScope, {
      role: "assistant",
      text: `Задача «${createdTask.title}» сохранена.`,
      linkedTask: {
        id: createdTask.id,
        title: createdTask.title,
      },
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
    appendMessage(accountScope, {
      role: userMessage.role,
      text: userMessage.text,
    });
    setText("");
    setIsSending(true);

    try {
      const result = await AiApi.parseMindHub(
        message,
        hubMode,
        requestMessages
      );
      setReceivedAiLimit({ scope: accountScope, limit: result.limit ?? null });

      appendMessage(accountScope, {
        role: "assistant",
        text:
          result.reply ||
          "Я рядом. Можешь продолжить мысль, и мы спокойно разберём её вместе.",
      });

      if (result.drafts.length > 0) {
        addDrafts(accountScope, result.drafts);
      }
    } catch (error) {
      console.error("AI_REQUEST_FAILED");
      const serverError =
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : null;

      appendMessage(accountScope, {
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
      : variant === "page" || variant === "drawer"
        ? "flex h-full min-h-0 flex-col overflow-hidden bg-transparent"
        : "flex h-[min(760px,calc(100svh-6rem))] min-h-128 max-h-[760px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none xl:h-[calc(100vh-12rem)] xl:min-h-160 xl:max-h-none";

  return (
    <section className={sectionClassName}>
      {variant !== "quick" && (
        <div className={`sticky top-0 z-10 border-b p-5 backdrop-blur-xl ${variant === "page" ? "border-white/40 bg-white/65 shadow-sm dark:border-white/10 dark:bg-slate-950/45 lg:pl-12" : "border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95"}`}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-300" />
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {variant === "page" ? "Ассистент" : "Разгрузка мыслей"}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {variant === "page" && (
                <button
                  type="button"
                  onClick={openTaskCreateLauncher}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-indigo-500 transition-colors hover:bg-indigo-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-indigo-300"
                  title="Новая задача"
                  aria-label="Новая задача"
                >
                  <Plus size={20} strokeWidth={2.5} />
                </button>
              )}
              {(messages.length > 0 || pendingDrafts.length > 0) && (
                <button
                  type="button"
                  onClick={() => setIsClearConfirmationOpen(true)}
                  disabled={isSending}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Очистить историю"
                  aria-label="Очистить историю"
                >
                  <Trash2 size={18} />
                </button>
              )}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Закрыть чат"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
          {isClearConfirmationOpen && (
            <div
              role="dialog"
              aria-label="Подтверждение очистки истории"
              className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-400/25 dark:bg-rose-500/10"
            >
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Очистить этот диалог?
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                На этом устройстве исчезнут сообщения и несохранённые черновики. Уже созданные задачи останутся.
              </p>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClearConfirmationOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearConversation(accountScope);
                    setTypedMessageIds(new Set());
                    setIsClearConfirmationOpen(false);
                    setIsJumpToLatestVisible(false);
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  Очистить
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className={`mind-hub-scrollbar h-full overflow-y-auto ${variant === "page" ? "bg-white/15 backdrop-blur-[2px] dark:bg-slate-950/10" : "bg-slate-100/60 dark:bg-slate-950/35"} ${
            variant === "quick" ? "px-4 py-4" : "px-5 py-5"
          }`}
        >
        <div className="flex flex-col gap-3">
          {!messages.length && (
            <div className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/80 dark:shadow-none sm:p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                  <Sparkles size={19} />
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    С чего начнём?
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Выбери сценарий или напиши своими словами. Перед отправкой всё можно изменить.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {STARTER_PROMPTS.map((starter) => (
                  <button
                    key={starter.title}
                    type="button"
                    onClick={() => applyStarterPrompt(starter.prompt)}
                    className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/10"
                  >
                    <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
                      {starter.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {starter.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
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
              onChange={(editedDraft) =>
                updateDraft(accountScope, draft.localId, editedDraft)
              }
              onDismiss={() => dismissDraft(draft.localId)}
              onConfirm={(editedDraft) =>
                confirmDraft(draft.localId, editedDraft)
              }
            />
          ))}
        </div>
        </div>
        {isJumpToLatestVisible && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-4 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-indigo-300 bg-white px-4 py-2 text-xs font-bold text-indigo-700 shadow-lg transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-indigo-400/30 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-slate-800"
            aria-label="Перейти к новым сообщениям"
          >
            <ArrowDown size={16} />
            К новым сообщениям
          </button>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className={`border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl ${variant === "page" ? "border-white/40 bg-white/65 dark:border-white/10 dark:bg-slate-950/50" : "border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95"}`}
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
            maxLength={isGuest ? 2000 : undefined}
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
            disabled={isGuest || isSending || (!isOnline && !isListening)}
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
        {isGuest && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            До 5 запросов за 24 часа. ИИ-провайдер получает отправленный текст.
            Не указывай персональные данные. Подтверждённые задачи сохраняются в браузере.
          </p>
        )}
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
