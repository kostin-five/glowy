import React from "react";
import {
  useCurrentEnergy,
  useUpdateCurrentEnergy,
} from "../../store/useAuthStore";

export const EnergySlider: React.FC = () => {
  const currentEnergy = useCurrentEnergy();
  const updateCurrentEnergy = useUpdateCurrentEnergy();

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-black text-slate-950 dark:text-slate-100">
          Энергия на сегодня
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Оцени, сколько сил есть сейчас.
        </p>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={currentEnergy}
        onChange={(e) => updateCurrentEnergy(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 focus:outline-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-slate-950 [&::-webkit-slider-thumb]:shadow-[0_0_14px_rgba(255,255,255,0.25)]"
      />

      <div className="flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500 dark:text-slate-400">
          Текущий заряд:
        </span>
        <span className="text-slate-900 dark:text-slate-100">
          {currentEnergy}%
        </span>
      </div>
    </div>
  );
};
