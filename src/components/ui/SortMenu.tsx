import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import {
  useSetSort,
  useSortDirection,
  useSortField,
  type SortDirection,
  type SortField,
} from "../../store/useTaskStore";
import { Fragment } from "react/jsx-runtime";

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
    <Menu as="div" className="relative inline-block text-left h-full">
      <MenuButton
        className={
          "flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 text-sm rounded-lg transition-all active:scale-95"
        }
      >
        {buttonText}
      </MenuButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems
          className={
            "absolute left-0 z-50 mt-2 w-48 origin-top-left rounded-xl bg-slate-900 border border-slate-700 shadow-2xl focus:outline-none overflow-hidden"
          }
        >
          {sortOptions.map((opt) => (
            <MenuItem key={opt.id}>
              {({ active }) => (
                <button
                  onClick={() => setSort(opt.field, opt.direction)}
                  className={`group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-indigo-500/10 text-indigo-400"
                      : "text-slate-400"
                  }`}
                >
                  {opt.label}
                </button>
              )}
            </MenuItem>
          ))}
        </MenuItems>
      </Transition>
    </Menu>
  );
};

export default SortMenu;
