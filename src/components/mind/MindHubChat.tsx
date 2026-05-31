import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Sparkles } from "lucide-react";
import AiApi from "../../api/AiApi";
import { useTaskStore } from "../../store/useTaskStore";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

const MindHubChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Я готова разобрать мысли на конкретные задачи.",
    },
  ]);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const message = text.trim();
    if (!message || isSending) return;

    appendMessage({ role: "user", text: message });
    setText("");
    setIsSending(true);

    try {
      const result = await AiApi.parseMindHub(message);

      if (result.tasks.length) {
        const store = useTaskStore.getState();
        store.setTasks([...store.tasks, ...result.tasks]);
        appendMessage({
          role: "assistant",
          text: `Я вытащила ${result.tasks.length} ${getTaskWord(
            result.tasks.length
          )} и добавила в список.`,
        });
      } else {
        appendMessage({
          role: "assistant",
          text:
            result.reply ||
            "Я не нашла конкретных задач, но вижу, что мыслей много. Можем разложить их ещё чуть подробнее.",
        });
      }
    } catch (error) {
      console.error(error);
      appendMessage({
        role: "assistant",
        text: "Не получилось разобрать мысли. Попробуй отправить ещё раз, можно короче или отдельными фразами.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="bg-slate-900/50 border border-slate-800 p-0 rounded-3xl flex flex-col xl:h-[calc(100vh-12rem)] xl:min-h-160 min-h-125 overflow-hidden">
      <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 p-5 backdrop-blur">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-indigo-300" />
          <h2 className="font-display text-xl font-bold text-slate-200">
            Хаб мыслей
          </h2>
        </div>
        <p className="text-sm leading-6 text-slate-400">
          Выгрузи сюда весь хаос из головы текстом. Я проанализирую твои мысли,
          разобью их на задачи и сам добавлю в список.
        </p>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-md"
                    : "bg-slate-800/80 text-slate-200 border border-slate-700/70 rounded-bl-md"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-slate-700/70 bg-slate-800/80 px-4 py-3 text-sm text-slate-300">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-300" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-300 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-300 [animation-delay:240ms]" />
                </span>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800 bg-slate-900/95 p-4"
      >
        <div className="flex items-end gap-3 rounded-2xl border border-slate-700 bg-slate-950/50 p-3 focus-within:border-indigo-500">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            placeholder="Например: надо ответить преподу, купить продукты, подготовиться к тесту..."
            className="custom-scrollbar max-h-40 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500"
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
