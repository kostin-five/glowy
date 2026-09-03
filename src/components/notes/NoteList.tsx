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

export default function NoteList(props: Props) {
  const empty = !props.loading && !props.error && props.notes.length === 0;
  return (
    <aside data-testid="notes-list-surface" className={`${props.hiddenOnMobile ? "hidden" : "flex"} min-h-0 flex-col rounded-3xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/50 lg:flex lg:w-80`}>
      <button type="button" onClick={props.onCreate} className="mb-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-4 font-bold text-white hover:bg-indigo-600">
        <Plus size={18} /> Новая заметка
      </button>
      <label className="relative mb-3">
        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
        <input value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} maxLength={200} placeholder="Поиск по заметкам" className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {[false, true].map((archived) => (
          <button key={String(archived)} type="button" onClick={() => props.onArchivedChange(archived)} className={`rounded-xl px-3 py-2 text-sm font-bold ${props.archived === archived ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300" : "text-slate-500"}`}>
            {archived ? "Архив" : "Активные"}
          </button>
        ))}
      </div>
      <div className="min-h-40 flex-1 space-y-2 overflow-y-auto">
        {props.loading && <p className="p-4 text-sm text-slate-500">Загружаем заметки…</p>}
        {props.error && <p className="p-4 text-sm text-rose-600">{props.error}</p>}
        {empty && (
          <div className="p-6 text-center text-sm text-slate-500">
            {props.query ? <Search className="mx-auto mb-2" /> : props.archived ? <Archive className="mx-auto mb-2" /> : <FileText className="mx-auto mb-2" />}
            {props.query ? "Ничего не найдено" : props.archived ? "В архиве пока пусто" : "Здесь появятся важные мысли"}
          </div>
        )}
        {props.notes.map((note) => (
          <button key={note.id} type="button" onClick={() => props.onSelect(note)} className={`w-full rounded-2xl border p-3 text-left ${props.selectedId === note.id ? "border-indigo-400 bg-indigo-500/10" : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"}`}>
            <strong className="block truncate text-sm">{note.title || "Без заголовка"}</strong>
            <span className="mt-1 block truncate text-xs text-slate-500">{note.content || "Пустая заметка"}</span>
            <time className="mt-2 block text-[11px] text-slate-400">{new Date(note.updatedAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</time>
          </button>
        ))}
      </div>
    </aside>
  );
}
