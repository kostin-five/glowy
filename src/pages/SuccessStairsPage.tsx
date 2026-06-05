import SuccessStairs from "../dashboard/SuccessStairs";
import { useCurrentXP, useUserLevel } from "../store/useTaskStore";
import { getLevelProgress } from "../utils/xp";

const SuccessStairsPage = () => {
  const currentLevel = useUserLevel();
  const currentXP = useCurrentXP();
  const progress = getLevelProgress(currentXP, currentLevel);

  return (
    <div className="flex flex-col gap-6 px-4 md:px-8 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-black text-slate-100">
          Лестница успеха
        </h1>
        <p className="text-slate-400 mt-2">
          Бесконечная прогрессия Glowy: сохраняй баланс, грамотно расходуй
          силы и получай XP за осознанно выполненные задачи.
        </p>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col gap-6">
          <div>
            <p className="text-sm font-semibold text-slate-400 mb-2">
              Текущий уровень
            </p>
            <div className="flex items-end gap-3">
              <span className="font-display text-6xl font-black text-indigo-300">
                {currentLevel}
              </span>
              <span className="pb-2 text-slate-400 font-medium">
                {currentXP} XP всего
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
              <span>
                До уровня {currentLevel + 1}
              </span>
              <span className="font-semibold text-indigo-300">
                {progress.earnedInsideLevel}/{progress.requiredInsideLevel} XP
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-indigo-500 to-cyan-400 shadow-[0_0_18px_rgba(99,102,241,0.55)] transition-all duration-500"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5">
            <h2 className="font-display text-xl font-bold text-slate-100 mb-4">
              Как начисляется XP
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-950/50 border border-slate-800 p-4">
                <p className="text-sm text-slate-400">Лёгкая задача</p>
                <p className="font-display text-2xl font-black text-emerald-300">
                  10 XP
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950/50 border border-slate-800 p-4">
                <p className="text-sm text-slate-400">Средняя нагрузка</p>
                <p className="font-display text-2xl font-black text-amber-300">
                  20 XP
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950/50 border border-slate-800 p-4">
                <p className="text-sm text-slate-400">Высокая энергия</p>
                <p className="font-display text-2xl font-black text-red-300">
                  30 XP
                </p>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-400 mt-4">
              XP начисляется один раз при первом выполнении задачи. Приоритет
              добавляет небольшой бонус: P1 x1.5, P2 x1.2, P3 x1.0.
            </p>
          </div>
        </div>

        <section className="xl:col-span-7 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 min-h-125">
          <SuccessStairs currentLevel={currentLevel} visibleSteps={7} />
        </section>
      </section>
    </div>
  );
};

export default SuccessStairsPage;
