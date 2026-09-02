import {
  useSetSort,
  useSortDirection,
  useSortField,
} from "../../store/useTaskStore";
import type { SortDirection, SortField } from "../../types";

interface SortOption {
  label: string;
  field: Exclude<SortField, null>;
  direction: SortDirection;
}

const sortOptions: SortOption[] = [
  { label: "Сначала поздние даты", field: "date", direction: "desc" },
  { label: "Сначала ранние даты", field: "date", direction: "asc" },
  { label: "По названию А-Я", field: "title", direction: "asc" },
  { label: "По названию Я-А", field: "title", direction: "desc" },
  {
    label: "Сначала высокий приоритет",
    field: "priority",
    direction: "desc",
  },
  {
    label: "Сначала низкий приоритет",
    field: "priority",
    direction: "asc",
  },
  { label: "Сначала сложные", field: "energy", direction: "desc" },
  { label: "Сначала легкие", field: "energy", direction: "asc" },
];

const SortMenu = () => {
  const sortField = useSortField();
  const sortDirection = useSortDirection();
  const setSort = useSetSort();
  const selectedValue = sortField ? `${sortField}:${sortDirection}` : "";

  return (
    <label className="relative flex h-10 w-full md:min-w-52 items-center">
      <span className="sr-only">Сортировка задач</span>
      <select
        aria-label="Сортировка задач"
        value={selectedValue}
        onChange={(event) => {
          if (!event.target.value) {
            setSort(null, "asc");
            return;
          }

          const [field, direction] = event.target.value.split(":") as [
            Exclude<SortField, null>,
            SortDirection
          ];
          setSort(field, direction);
        }}
        className="h-full w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all hover:bg-slate-100 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300 dark:shadow-none dark:hover:bg-slate-800"
      >
        <option value="">Без сортировки</option>
        {sortOptions.map((option) => {
          const value = `${option.field}:${option.direction}`;

          return (
            <option key={value} value={value}>
              {option.label}
            </option>
          );
        })}
      </select>
      <span className="pointer-events-none absolute right-3 text-slate-400">
        ▾
      </span>
    </label>
  );
};

export default SortMenu;
