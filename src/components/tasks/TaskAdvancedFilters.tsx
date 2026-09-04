import { Filter, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import type { EnergyLevel, Priority } from "../../types";
import {
  countTaskAdvancedFilters,
  EMPTY_TASK_ADVANCED_FILTERS,
  type TaskAdvancedFilterState,
  type TaskDateFilter,
} from "../../utils/taskAdvancedFilters";

interface TaskAdvancedFiltersProps {
  value: TaskAdvancedFilterState;
  categories: string[];
  onChange: (value: TaskAdvancedFilterState) => void;
}

const selectClass = "h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

const TaskAdvancedFilters = ({ value, categories, onChange }: TaskAdvancedFiltersProps) => {
  const [open, setOpen] = useState(false);
  const activeCount = countTaskAdvancedFilters(value);
  const change = <K extends keyof TaskAdvancedFilterState>(key: K, next: TaskAdvancedFilterState[K]) => onChange({ ...value, [key]: next });

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
        <Filter size={16} />
        Фильтры
        {activeCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1 text-xs text-white" aria-label={`Активных фильтров: ${activeCount}`}>{activeCount}</span>}
      </button>

      {open && (
        <div className="mt-2 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2 lg:grid-cols-4" aria-label="Дополнительные фильтры задач">
          <label className="grid gap-1 text-xs text-slate-500">Срок
            <select className={selectClass} value={value.date} onChange={(event) => change("date", event.target.value as TaskDateFilter)}>
              <option value="all">Любой</option><option value="overdue">Просроченные</option><option value="today">Сегодня</option><option value="future">Будущие</option><option value="undated">Без даты</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-500">Энергия
            <select className={selectClass} value={value.energy} onChange={(event) => change("energy", event.target.value as EnergyLevel | "all")}>
              <option value="all">Любая</option><option value="low">Низкая</option><option value="med">Средняя</option><option value="high">Высокая</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-500">Приоритет
            <select className={selectClass} value={value.priority} onChange={(event) => change("priority", event.target.value as Priority | "all")}>
              <option value="all">Любой</option><option value="🔥 P1">Высокий</option><option value="⚡️ P2">Средний</option><option value="💤 P3">Низкий</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-500">Категория
            <select className={selectClass} value={value.category} onChange={(event) => change("category", event.target.value)}>
              <option value="">Все категории</option>{categories.filter(Boolean).map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button type="button" disabled={activeCount === 0} onClick={() => onChange(EMPTY_TASK_ADVANCED_FILTERS)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-indigo-500 disabled:opacity-40"><RotateCcw size={14} />Сбросить</button>
            <button type="button" onClick={() => setOpen(false)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"><X size={14} />Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskAdvancedFilters;
