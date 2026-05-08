import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  useSetSort,
  useSortDirection,
  useSortField,
  type SortDirection,
  type SortField,
} from "../../store/useTaskStore";

const SortMenu = () => {
  const sortField = useSortField();
  const sortDirection = useSortDirection();
  interface sortOptionsType {
    id: number;
    label: string;
    field: SortField;
    direction: SortDirection;
  }
  const setSort = useSetSort();
  const sortOptions: sortOptionsType[] = [
    { id: 1, label: "По дате (новые)", field: "date", direction: "desc" },
    { id: 2, label: "По дате (старые)", field: "date", direction: "asc" },
    { id: 3, label: "По энергии (max)", field: "energy", direction: "desc" },
    { id: 4, label: "По энергии (min)", field: "energy", direction: "asc" },
  ];

  const currentOption = sortOptions.find(
    (opt) => opt.field === sortField && opt.direction === sortDirection
  );

  const buttonText = currentOption ? currentOption.label : "Сортировка";
  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton
        className={
          "flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 text-sm rounded-lg transition-all active:scale-95"
        }
      >
        {buttonText}
      </MenuButton>
      <MenuItems
        className={
          "absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 p-1.5"
        }
      >
        {sortOptions.map((opt) => (
          <MenuItem key={opt.id}>
            {({ active }) => (
              <button
                onClick={() => setSort(opt.field, opt.direction)}
                className={`group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-indigo-500/10 text-indigo-400" : "text-slate-400"
                }`}
              >
                {opt.label}
              </button>
            )}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
};

export default SortMenu;
