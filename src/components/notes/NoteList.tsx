import { Archive, FileText, Plus, Search } from "lucide-react";
import type { Note } from "../../types";

type Props = {
  notes: Note[];
  selectedId: number | null;
  query: string;
  archived: boolean;
  loading: boolean;
  error: string | null;
  onQueryChange: (value: string) => void;
  onArchivedChange: (value: boolean) => void;
  onSelect: (note: Note) => void;
  onCreate: () => void;
  hiddenOnMobile?: boolean;
};

const isToday = (value: string) => {
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
};

const notePreview = (note: Note) => note.content.trim().replace(/\s+/g, " ") || "Пустая заметка";

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Дата не указана"
    : date.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
};

export default function NoteList(props: Props) {
  const empty = !props.loading && !props.error && props.notes.length === 0;
  const groups = [
    { label: "Сегодня", notes: props.notes.filter((note) => isToday(note.updatedAt)) },
    { label: "Ранее", notes: props.notes.filter((note) => !isToday(note.updatedAt)) },
  ].filter((group) => group.notes.length > 0);

  return (
    <aside
      data-testid="notes-list-surface"
      className={`${props.hiddenOnMobile ? "hidden" : "flex"} min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-white/50 bg-white/70 p-3 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/10 lg:flex lg:w-[21rem] lg:shrink-0`}
    >
      <button
        type="button"
        onClick={props.onCreate}
        className="mb-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-500 px-4 font-bold text-white shadow-lg shadow-indigo-950/15 transition hover:-translate-y-0.5 hover:shadow-indigo-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <Plus size={19} /> Новая заметка
      </button>

      <label className="relative mb-3">
        <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
        <input
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          maxLength={200}
          placeholder="Поиск по заметкам"
          className="min-h-12 w-full rounded-2xl border border-slate-200/80 bg-white/65 pl-10 pr-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15 dark:border-white/10 dark:bg-slate-950/45"
        />
      </label>

      <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200/70 bg-slate-100/60 p-1 dark:border-white/10 dark:bg-slate-950/35">
        {[false, true].map((archived) => (
          <button
            key={String(archived)}
            type="button"
            onClick={() => props.onArchivedChange(archived)}
            className={`min-h-10 rounded-xl px-3 text-sm font-bold transition ${props.archived === archived ? "bg-white text-indigo-600 shadow-sm dark:bg-indigo-500/18 dark:text-indigo-200" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            {archived ? "Архив" : "Активные"}
            {props.archived === archived && props.notes.length > 0 && (
              <span className="ml-1 text-xs opacity-70">{props.notes.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="notes-scrollbar min-h-40 flex-1 space-y-4 overflow-y-auto pr-1">
        {props.loading && <p className="p-4 text-sm text-slate-500">Загружаем заметки…</p>}
        {props.error && <p className="p-4 text-sm text-rose-600">{props.error}</p>}
        {empty && (
          <div className="rounded-2xl border border-dashed border-slate-300/80 p-7 text-center text-sm text-slate-500 dark:border-white/15">
            {props.query ? <Search className="mx-auto mb-2" /> : props.archived ? <Archive className="mx-auto mb-2" /> : <FileText className="mx-auto mb-2" />}
            {props.query ? "Ничего не найдено" : props.archived ? "В архиве пока пусто" : "Здесь появятся важные мысли"}
          </div>
        )}

        {groups.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{group.label}</h2>
              <span className="text-[11px] text-slate-400">{group.notes.length}</span>
            </div>
            <div className="space-y-2">
              {group.notes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => props.onSelect(note)}
                  className={`group relative w-full overflow-hidden rounded-2xl border p-3.5 text-left transition ${props.selectedId === note.id ? "border-indigo-400/80 bg-indigo-500/12 shadow-md shadow-indigo-950/5" : "border-slate-200/80 bg-white/35 hover:-translate-y-0.5 hover:border-indigo-300/60 hover:bg-white/60 dark:border-white/10 dark:bg-slate-950/25 dark:hover:border-indigo-400/35 dark:hover:bg-slate-900/55"}`}
                >
                  {props.selectedId === note.id && <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-indigo-400 to-cyan-400" />}
                  <strong className="block truncate text-sm text-slate-900 dark:text-slate-100">{note.title || "Без заголовка"}</strong>
                  <span className="mt-1.5 block truncate text-xs leading-5 text-slate-500 dark:text-slate-400">{notePreview(note)}</span>
                  <time className="mt-2 block text-[11px] text-slate-400">{formatUpdatedAt(note.updatedAt)}</time>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
