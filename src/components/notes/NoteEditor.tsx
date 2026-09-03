import { useRef } from "react";
import { Archive, ArchiveRestore, ArrowLeft, Link2, Sparkles, Unlink } from "lucide-react";
import { Link } from "react-router-dom";
import type { Note, Task } from "../../types";

type Props = {
  note: Note | null;
  title: string;
  content: string;
  status: "idle" | "dirty" | "saving" | "saved" | "error";
  loading?: boolean;
  tasks: Task[];
  onTitle: (value: string) => void;
  onContent: (value: string) => void;
  onSave: () => void;
  onArchive: () => void;
  onLink: (taskId: number) => void;
  onUnlink: (taskId: number) => void;
  onDraft: (fragment: string) => void;
  onBack: () => void;
  hiddenOnMobile?: boolean;
};

export default function NoteEditor(props: Props) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const linkedIds = new Set(props.note?.taskLinks.map((link) => link.task.id) ?? []);
  const statusText = props.loading ? "Загружаем заметку…" : { idle: "", dirty: "Есть несохранённые изменения", saving: "Сохраняем…", saved: "Сохранено", error: "Не удалось сохранить. Попробуйте ещё раз" }[props.status];
  const requestDraft = () => {
    const area = textRef.current;
    const fragment = area?.value.slice(area.selectionStart, area.selectionEnd).trim() ?? "";
    props.onDraft(fragment);
  };
  return (
    <section aria-busy={props.loading || undefined} data-testid="notes-editor-surface" className={`${props.hiddenOnMobile ? "hidden" : "flex"} min-h-[32rem] min-w-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/50 md:p-6 lg:flex`}>
      <button
        type="button"
        onClick={props.onBack}
        disabled={props.status === "saving"}
        className="mb-3 inline-flex min-h-11 items-center self-start rounded-xl px-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
      >
        <ArrowLeft size={18} className="mr-2" /> Назад к заметкам
      </button>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span role="status" className={`mr-auto text-xs ${props.status === "error" ? "text-rose-600" : "text-slate-500"}`}>{statusText}</span>
        {props.note && <button type="button" onClick={props.onArchive} disabled={props.loading} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800">{props.note.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}{props.note.archived ? "Восстановить" : "В архив"}</button>}
        <button type="button" onClick={props.onSave} disabled={props.loading || props.status === "saving" || (!props.title.trim() && !props.content.trim())} className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Сохранить</button>
      </div>
      <input aria-label="Заголовок заметки" disabled={props.loading} value={props.title} onChange={(e) => props.onTitle(e.target.value)} maxLength={200} placeholder="Заголовок" className="mb-3 bg-transparent font-display text-2xl font-bold outline-none placeholder:text-slate-400 disabled:opacity-50" />
      <textarea ref={textRef} aria-label="Текст заметки" disabled={props.loading} value={props.content} onChange={(e) => props.onContent(e.target.value)} maxLength={50000} placeholder="Запишите мысль, к которой хочется вернуться…" className="min-h-64 flex-1 resize-none rounded-2xl border border-slate-200 bg-white/50 p-4 leading-7 outline-none focus:border-indigo-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950/40" />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled={props.loading || !props.note} onClick={requestDraft} className="inline-flex items-center gap-2 rounded-xl bg-violet-500/10 px-3 py-2 text-sm font-bold text-violet-700 disabled:opacity-40 dark:text-violet-300"><Sparkles size={16} /> Предложить задачу из фрагмента</button>
        {props.note && <select aria-label="Связать с задачей" disabled={props.loading} defaultValue="" onChange={(e) => { if (e.target.value) props.onLink(Number(e.target.value)); e.target.value = ""; }} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700"><option value="">Связать с задачей…</option>{props.tasks.filter((task) => !linkedIds.has(task.id)).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select>}
      </div>
      {!!props.note?.taskLinks.length && <div className="mt-4 flex flex-wrap gap-2">{props.note.taskLinks.map(({ task }) => <span key={task.id} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2 py-1 text-sm dark:border-slate-700"><Link2 size={14} /><Link to={`/tasks?task=${task.id}`} className="max-w-48 truncate hover:text-indigo-500">{task.title}</Link><button type="button" onClick={() => props.onUnlink(task.id)} aria-label={`Убрать связь с задачей «${task.title}»`} className="p-1 text-slate-400 hover:text-rose-500"><Unlink size={13} /></button></span>)}</div>}
    </section>
  );
}
