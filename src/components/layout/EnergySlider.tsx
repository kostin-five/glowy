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
    <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl flex flex-col justify-between">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
          Энергопотенциал
        </h3>
        <span className="text-sm font-bold text-indigo-400">
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

      <div className="mt-4 flex justify-between items-center text-xs border-t border-slate-800/60 pt-3">
        <span className="ext-slate-400">Доступно на день:</span>
        <span
          className={`font-bold ${
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
