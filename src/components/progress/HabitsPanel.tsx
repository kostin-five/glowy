import {
  Archive,
  ArchiveRestore,
  Check,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Habit } from "../../types";
import { formatLocalDateOnly } from "../../utils/localDate";
import Modal from "../ui/Modal";
import FirstUsePopover from "../onboarding/FirstUsePopover";

interface HabitsPanelProps {
  habits: Habit[];
  today: string;
  isCreating: boolean;
  pendingHabitIds: Set<number>;
  onCreate: (title: string) => Promise<boolean>;
  onToggleDate: (habit: Habit, date: string) => Promise<void>;
  onArchive: (habit: Habit) => Promise<void>;
  onRestore: (habit: Habit) => Promise<void>;
  onRename: (habit: Habit, title: string) => Promise<boolean>;
  onDelete: (habit: Habit) => Promise<void>;
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  day: "numeric",
});
const addDaysToDateOnly = (date: string, amount: number) => {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + amount);
  return formatLocalDateOnly(next);
};

const HabitsPanel = ({
  habits,
  today,
  isCreating,
  pendingHabitIds,
  onCreate,
  onToggleDate,
  onArchive,
  onRestore,
  onRename,
  onDelete,
}: HabitsPanelProps) => {
  const [title, setTitle] = useState("");
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const activeHabits = habits.filter((habit) => !habit.archived);
  const archivedHabits = habits.filter((habit) => habit.archived);
  const dates = useMemo(
    () => [-2, -1, 0, 1, 2].map((offset) => addDaysToDateOnly(today, offset)),
    [today]
  );

  const createHabit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return;
    if (await onCreate(normalizedTitle)) setTitle("");
  };

  const saveTitle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingHabit || !editingTitle.trim()) return;
    if (await onRename(editingHabit, editingTitle.trim())) setEditingHabit(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
        <h2 className="font-display text-2xl font-black text-slate-900 dark:text-slate-100">
          Новая привычка
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Добавь одно регулярное действие. Отмечай сделанное в своём ритме.
        </p>
        <form onSubmit={createHabit} className="mt-5 space-y-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="Например: прочитать 10 страниц"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={!title.trim() || isCreating}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={17} />
            {isCreating ? "Добавляю..." : "Добавить"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
        <h2 className="font-display text-2xl font-black text-slate-900 dark:text-slate-100">
          Привычки в ритме недели
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Отмечай сделанное за последние дни и наблюдай, как постепенно складывается твой ритм.</p>
        {activeHabits.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-400">
            Здесь появятся действия, которые хочется поддерживать регулярно.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {activeHabits.map((habit, habitIndex) => (
              <article key={habit.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-10 w-1.5 shrink-0 rounded-full ${["bg-cyan-400", "bg-violet-400", "bg-emerald-400", "bg-amber-400"][habitIndex % 4]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900 dark:text-slate-100">{habit.title}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Серия: {habit.currentStreak} дней</p>
                  </div>
                  <button type="button" onClick={() => { setEditingHabit(habit); setEditingTitle(habit.title); }} disabled={pendingHabitIds.has(habit.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-500/10 hover:text-indigo-500 disabled:opacity-50" aria-label="Редактировать привычку" title="Редактировать"><Pencil size={16} /></button>
                  <button type="button" onClick={() => void onArchive(habit)} disabled={pendingHabitIds.has(habit.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-100" aria-label="Убрать привычку в архив" title="В архив"><Archive size={17} /></button>
                  <button type="button" onClick={() => setDeletingHabit(habit)} disabled={pendingHabitIds.has(habit.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-50" aria-label="Удалить привычку" title="Удалить"><Trash2 size={17} /></button>
                </div>

                <div className="relative mt-4 grid grid-cols-5 gap-2">
                  {dates.map((date) => {
                    const completed = habit.checkDates.includes(date);
                    const future = date > today;
                    const isToday = date === today;
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => void onToggleDate(habit, date)}
                        disabled={future || pendingHabitIds.has(habit.id)}
                        aria-pressed={completed}
                        className={`flex min-h-16 flex-col items-center justify-center rounded-xl border px-1 text-center transition-all ${
                          completed
                            ? "border-emerald-400 bg-emerald-400/15 text-emerald-700 dark:text-emerald-200"
                            : isToday
                              ? "border-indigo-400 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200"
                              : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400"
                        } ${future ? "cursor-not-allowed opacity-45" : "hover:-translate-y-0.5 hover:border-indigo-400"}`}
                      >
                        {completed && <Check size={15} className="mb-0.5" />}
                        <span className="text-[11px] font-bold capitalize">{dateFormatter.format(new Date(`${date}T12:00:00`))}</span>
                      </button>
                    );
                  })}
                  {habitIndex === 0 && (
                    <FirstUsePopover id="habitTracking">
                      Отмечай привычку по дням. Будущие даты останутся
                      недоступными, а прошлую отметку можно исправить.
                    </FirstUsePopover>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      </div>

      <button
        type="button"
        onClick={() => setIsArchiveOpen(true)}
        className="flex w-full items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-indigo-400/50 hover:bg-indigo-500/5 dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none dark:hover:border-indigo-400/40"
      >
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300"><Archive size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-xl font-black text-slate-900 dark:text-slate-100">Архив привычек</span>
          <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">Отложенные привычки можно вернуть в любой момент.</span>
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-300">{archivedHabits.length}</span>
      </button>

      <Modal isOpen={isArchiveOpen} onClose={() => setIsArchiveOpen(false)} title="Архив привычек">
        {archivedHabits.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:text-slate-400">В архиве пока пусто. Здесь появятся привычки, которые ты решишь временно отложить.</p>
        ) : (
          <div className="space-y-2">
            {archivedHabits.map((habit) => (
              <div key={habit.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-300">{habit.title}</span>
                <button type="button" onClick={() => void onRestore(habit)} disabled={pendingHabitIds.has(habit.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-indigo-500 hover:bg-indigo-500/10 disabled:opacity-50" aria-label="Вернуть привычку" title="Вернуть привычку"><ArchiveRestore size={17} /></button>
                <button type="button" onClick={() => { setIsArchiveOpen(false); setDeletingHabit(habit); }} disabled={pendingHabitIds.has(habit.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-50" aria-label="Удалить привычку" title="Удалить привычку"><Trash2 size={17} /></button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(editingHabit)} onClose={() => setEditingHabit(null)} title="Изменить привычку">
        <form onSubmit={saveTitle} className="space-y-4">
          <input value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} maxLength={120} autoFocus className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          <button type="submit" disabled={!editingTitle.trim() || (editingHabit ? pendingHabitIds.has(editingHabit.id) : false)} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50">Сохранить</button>
        </form>
      </Modal>

      <Modal isOpen={Boolean(deletingHabit)} onClose={() => setDeletingHabit(null)} title="Удалить привычку?">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">Привычка и все её отметки будут удалены без восстановления.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setDeletingHabit(null)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">Отмена</button>
          <button type="button" onClick={() => { if (deletingHabit) void onDelete(deletingHabit).then(() => setDeletingHabit(null)); }} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500">Удалить</button>
        </div>
      </Modal>
    </div>
  );
};

export default HabitsPanel;
