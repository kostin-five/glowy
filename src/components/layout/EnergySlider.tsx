import React from "react";
import { useEnergyLimit, useUpdateEnergyLimit } from "../../store/useAuthStore";
import { useTasks } from "../../store/useTaskStore";

export const EnergySlider: React.FC = () => {
  const energyLimit = useEnergyLimit();
  const tasks = useTasks();
  const updateEnergyLimit = useUpdateEnergyLimit();

  const consumedEnergy = tasks
    .filter((task) => !task.completed)
    .reduce(
      (acc, cur) =>
        cur.energyLevel === "low"
          ? acc + 10
          : cur.energyLevel === "med"
          ? acc + 25
          : acc + 50,
      0
    );

  const remainingEnergy = energyLimit - consumedEnergy;

  const energyStatuses: Record<number, string> = {
    0: "🫗 Полное истощение",
    20: "🍋 Выжатый лимон",
    40: "🧘 Низкий заряд",
    60: "🔋 Стабильный режим",
    80: "🚀 Продуктивный день",
    100: "🔥 Режим терминатора",
  };

  return (
    <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl flex flex-col justify-between gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-display text-xl font-bold text-slate-200">
              Энергопотенциал
            </h2>
            <p className="text-sm leading-relaxed text-slate-400">
              Дневной лимит сил на задачи.
            </p>
          </div>
        </div>
        <span className="shrink-0 text-sm font-semibold text-indigo-300">
          {energyStatuses[energyLimit] || `${energyLimit}%`}
        </span>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        step="20"
        value={energyLimit}
        onChange={(e) => updateEnergyLimit(Number(e.target.value))}
        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
      />

      <div className="flex justify-between items-center gap-4 text-xs border-t border-slate-800/60 pt-3">
        <span className="text-slate-400">Доступно на день:</span>
        <span
          className={`font-display font-bold ${
            remainingEnergy < 0 ? "text-red-500" : "text-emerald-500"
          }`}
        >
          {remainingEnergy}% из {energyLimit}%
        </span>
      </div>

      {remainingEnergy < 0 && (
        <p className="text-[11px] text-rose-400/90 mt-2 text-center bg-rose-500/5 border border-rose-500/10 py-1.5 rounded-xl animate-pulse">
          ⚠️ Превышен лимит! Задачи требуют больше энергии, чем у тебя есть.
        </p>
      )}
    </div>
  );
};
