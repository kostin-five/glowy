import { Link } from "react-router-dom";
import TaskList from "../components/tasks/TaskList";
import { useEffect, useState } from "react";
import useTypewriter from "../hooks/useTypewriter";
import SuccessStairs from "../dashboard/SuccessStairs";
import { useIsLoading, useUserLevel } from "../store/useTaskStore";
import Spinner from "../components/ui/Spinner";
import AiApi from "../api/AiApi";

const DashboardPage = () => {
  const [isThinking, setIsThinking] = useState(true);
  const [aiMessage, setAIMessage] = useState("");
  const currentLevel = useUserLevel();
  const isLoading = useIsLoading();

  useEffect(() => {
    const fetchAdvice = async () => {
      setIsThinking(true);
      const data = await AiApi.getAdvice();
      setAIMessage(data.message);
      setIsThinking(false);
    };

    fetchAdvice();
  }, []);

  const typewriter = useTypewriter(aiMessage, 50);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-100">
          Пункт управления
        </h1>
        <p className="text-slate-400 mt-1">
          Твой сфокусированный процесс на сегодня
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-3 bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-col h-125 overflow-hidden">
          <h2 className="text-xl font-bold text-slate-200 mb-6">
            Лестница успеха
          </h2>
          <SuccessStairs currentLevel={currentLevel} />
        </section>

        <section className="xl:col-span-5 bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-col h-125">
          <h2 className="text-xl font-bold text-slate-200 mb-6">
            Хаб выгрузки мыслей
            <span
              className={`w-2 h-2 rounded-full ${
                isThinking ? "bg-amber-500 animate-pulse" : "bg-indigo-500"
              }`}
            ></span>
          </h2>
          <div className="flex-1 bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-6 flex flex-col justify-center">
            {isThinking ? (
              <div className="flex flex-col items-center justify-center h-full text-indigo-400/50 space-y-4">
                <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="text-sm uppercase tracking-widest animate-pulse">
                  Glowy анализирует данные...
                </p>
              </div>
            ) : (
              <div className="text-indigo-300 leading-relaxed font-medium">
                {typewriter.displayedText}

                {typewriter.isTyping && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse"></span>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="xl:col-span-4 bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-col xl:h-125">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-200">Твои задачи</h2>
            <Link
              to={"/tasks"}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Смотреть все ↗
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? <Spinner /> : <TaskList />}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
