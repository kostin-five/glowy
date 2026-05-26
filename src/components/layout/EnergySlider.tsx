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
    20: "🍋 Выжатый лимон",
    40: "🧘 Низкий заряд",
    60: "🔋 Стабильный режим",
    80: "🚀 Продуктивный день",
    100: "🔥 Режим терминатора",
  };

  return (
    <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-zinc-500">Энергопотенциал</h3>
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {energyStatuses[energyLimit] || `${energyLimit}%`}
        </span>
      </div>

      <input
        type="range"
        min="20"
        max="100"
        step="20"
        value={energyLimit}
        onChange={(e) => updateEnergyLimit(Number(e.target.value))}
        className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
      />

      <div className="mt-3 flex justify-between text-xs">
        <span className="text-zinc-400">Доступно на день:</span>
        <span
          className={`font-bold ${
            remainingEnergy < 0 ? "text-red-500" : "text-emerald-500"
          }`}
        >
          {remainingEnergy}% из {energyLimit}%
        </span>
      </div>

      {remainingEnergy < 0 && (
        <p className="text-[11px] text-red-400 mt-1 animate-pulse">
          ⚠️ Превышен лимит! Задачи требуют больше энергии, чем у тебя есть.
        </p>
      )}
    </div>
  );
};
