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
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 className="font-display text-lg 2xl:text-xl font-bold text-slate-200">
            Энергопотенциал
          </h2>
          <span className="min-w-0 max-w-full shrink whitespace-normal break-words text-right text-xs 2xl:text-sm font-semibold text-indigo-300">
            {energyStatuses[energyLimit] || `${energyLimit}%`}
          </span>
        </div>
        <p className="whitespace-nowrap text-xs leading-relaxed text-slate-400">
          Лимит сил на день.
        </p>
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

      <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1 text-xs border-t border-slate-800/60 pt-3">
        <span className="whitespace-nowrap text-slate-400">
          Доступно на день:
        </span>
        <span
          className={`font-display font-bold whitespace-nowrap ${
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
