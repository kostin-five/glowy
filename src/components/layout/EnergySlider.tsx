import React from "react";
import {
  useCurrentEnergy,
  useUpdateCurrentEnergy,
} from "../../store/useAuthStore";

export const EnergySlider: React.FC = () => {
  const currentEnergy = useCurrentEnergy();
  const updateCurrentEnergy = useUpdateCurrentEnergy();
  const isCritical = currentEnergy <= 20;

  const energyStatuses: Record<number, string> = {
    0: "🫗 Полное истощение",
    10: "🧊 Почти на нуле",
    20: "🍋 Выжатый лимон",
    30: "🌧️ Нужен мягкий темп",
    40: "🧘 Низкий заряд",
    50: "☕ Половина бака",
    60: "🔋 Стабильный режим",
    70: "🌿 Хороший ресурс",
    80: "🚀 Продуктивный день",
    90: "⚡ Почти максимум",
    100: "🔥 Режим терминатора",
  };

  return (
    <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-slate-950 dark:text-slate-100 2xl:text-xl">
            Энергопотенциал
          </h2>
        </div>
        <span
          className={`inline-flex max-w-full self-start rounded-full border px-2.5 py-1 text-xs font-semibold leading-snug ${
            isCritical
              ? "border-red-500/20 bg-red-500/10 text-red-500 dark:text-red-300"
              : "border-indigo-500/20 bg-indigo-500/10 text-indigo-500 dark:text-indigo-300"
          }`}
        >
          <span className="min-w-0 wrap-break-words">
            {energyStatuses[currentEnergy] || `${currentEnergy}%`}
          </span>
        </span>
        <p className="max-w-full text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Ручная оценка твоего заряда.
        </p>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={10}
        value={currentEnergy}
        onChange={(e) => updateCurrentEnergy(Number(e.target.value))}
        className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 focus:outline-none dark:bg-slate-800 ${
          isCritical ? "accent-red-500" : "accent-indigo-500"
        }`}
      />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-200 pt-3 text-xs dark:border-slate-800/60">
        <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">
          Текущий заряд:
        </span>
        <span
          className={`font-display font-bold whitespace-nowrap ${
            isCritical
              ? "text-red-500 dark:text-red-400"
              : "text-emerald-600 dark:text-emerald-500"
          }`}
        >
          {currentEnergy}% из 100%
        </span>
      </div>

      {isCritical && (
        <p className="mt-1 rounded-xl border border-red-500/15 bg-red-500/10 px-3 py-2 text-center text-[11px] font-medium text-red-500 dark:text-red-300">
          Критический уровень! Пора отдохнуть.
        </p>
      )}
    </div>
  );
};
