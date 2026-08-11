import { Sparkles } from "lucide-react";
import MindHubChat from "../components/mind/MindHubChat";

const GlowyAiPage = () => {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 text-white shadow-[0_0_24px_rgba(34,211,238,0.3)]">
          <Sparkles size={21} aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-black text-slate-900 dark:text-slate-100 sm:text-3xl">
            Glowy AI
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Полный чат для вопросов, мыслей и черновиков задач.
          </p>
        </div>
      </header>

      <MindHubChat variant="page" />
    </div>
  );
};

export default GlowyAiPage;
