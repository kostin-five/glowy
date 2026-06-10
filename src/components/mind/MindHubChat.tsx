import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MutableRefObject,
} from "react";
import { Check, Copy, Send, Sparkles } from "lucide-react";
import AiApi, {
  type MindHubLimit,
  type MindHubMessage,
  type MindHubMode,
} from "../../api/AiApi";
import { useTaskStore } from "../../store/useTaskStore";
import useTypewriter from "../../hooks/useTypewriter";
import {
  GUEST_REQUEST_LIMIT,
  useGuestRequestsCount,
  useGuestRequestsResetDate,
  useIsGuest,
} from "../../store/useAuthStore";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

interface MindHubChatProps {
  inputRef?: MutableRefObject<HTMLTextAreaElement | null>;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
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

const MindHubChat = ({ inputRef }: MindHubChatProps) => {
  const [hubMode, setHubMode] = useState<MindHubMode>("parse");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Я готов разобрать мысли на конкретные задачи.",
    },
  ]);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [typedMessageIds, setTypedMessageIds] = useState<Set<number>>(
    () => new Set([1])
  );
  const [registeredAiLimit, setRegisteredAiLimit] =
    useState<MindHubLimit | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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

  const appendMessage = (message: Omit<ChatMessage, "id">) => {
    setMessages((current) => [
      ...current,
      {
        ...message,
        id: Date.now() + current.length,
      },
    ]);
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const message = text.trim();
    if (!message || isSending) return;

    const userMessage: ChatMessage = {
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
    setMessages((current) => [...current, userMessage]);
    setText("");
    setIsSending(true);

    try {
      const result = await AiApi.parseMindHub(
        message,
        hubMode,
        requestMessages
      );
      setRegisteredAiLimit(result.limit ?? null);

      if (result.tasks.length) {
        const store = useTaskStore.getState();
        store.setTasks([...store.tasks, ...result.tasks]);
        appendMessage({
          role: "assistant",
          text:
            hubMode === "parse"
              ? `Я вытащил ${result.tasks.length} ${getTaskWord(
                  result.tasks.length
                )} и добавил в список.`
              : result.reply || "Я рядом и слышу тебя.",
        });
      } else {
        appendMessage({
          role: "assistant",
          text:
            result.reply ||
            "Я не нашёл конкретных задач, но вижу, что мыслей много. Можем разложить их ещё чуть подробнее.",
        });
      }
    } catch (error) {
      console.error(error);
      appendMessage({
        role: "assistant",
        text:
          hubMode === "chat"
            ? "Не получилось ответить в диалоге. Попробуй отправить сообщение ещё раз."
            : "Не получилось разобрать мысли. Попробуй отправить ещё раз, можно короче или отдельными фразами.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="flex min-h-125 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none xl:h-[calc(100vh-12rem)] xl:min-h-160">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-indigo-300" />
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            Хаб мыслей
          </h2>
        </div>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
          {hubMode === "parse"
            ? "Выгрузи сюда весь хаос из головы текстом. Я проанализирую твои мысли, разобью их на задачи и сам добавлю в список."
            : "Можно просто написать, что происходит. Я отвечу как спокойный коуч и помогу бережно разложить мысли."}
        </p>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5"
      >
        <div className="flex flex-col gap-3">
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

        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 bg-white/95 p-4 dark:border-slate-800 dark:bg-slate-900/95"
      >
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950/60">
          {[
            { value: "chat" as const, label: "💬 Диалог" },
            { value: "parse" as const, label: "⚡️ В задачи" },
          ].map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setHubMode(mode.value)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                hubMode === mode.value
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              }`}
              aria-pressed={hubMode === mode.value}
            >
              {mode.label}
            </button>
          ))}
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
        <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm focus-within:border-indigo-500 dark:border-slate-700 dark:bg-slate-950/50 dark:shadow-none">
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
              hubMode === "parse"
                ? "Например: надо ответить преподу, купить продукты, подготовиться к тесту..."
                : "Например: я устал, всё навалилось и не понимаю, с чего начать..."
            }
            className="custom-scrollbar max-h-40 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-500"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!text.trim() || isSending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Отправить мысли"
          >
            <Send size={18} />
          </button>
        </div>
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

const getTaskWord = (count: number) => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastDigit === 1 && lastTwoDigits !== 11) return "задачу";
  if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits)) {
    return "задачи";
  }

  return "задач";
};

export default MindHubChat;
