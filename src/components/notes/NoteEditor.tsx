import { useRef } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarClock,
  Check,
  FileText,
  Link2,
  Sparkles,
  Unlink,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Note, Task } from "../../types";
import { useIsGuest } from "../../store/useAuthStore";

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

const formatDate = (value?: string) => {
  if (!value) return "После сохранения";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Дата не указана"
    : date.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
};

const wordLabel = (count: number) => {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return "слов";
  const last = count % 10;
  if (last === 1) return "слово";
  if (last >= 2 && last <= 4) return "слова";
  return "слов";
};

export default function NoteEditor(props: Props) {
  const isGuest = useIsGuest();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const linkedIds = new Set(props.note?.taskLinks.map((link) => link.task.id) ?? []);
  const availableTasks = props.tasks.filter((task) => !linkedIds.has(task.id));
  const words = props.content.trim() ? props.content.trim().split(/\s+/).length : 0;
  const statusText = props.loading
    ? "Загружаем заметку…"
    : {
        idle: "",
        dirty: "Есть несохранённые изменения",
        saving: "Сохраняем…",
        saved: "Сохранено",
        error: "Не удалось сохранить. Попробуйте ещё раз",
      }[props.status];

  const requestDraft = () => {
    const area = textRef.current;
    const fragment = area?.value.slice(area.selectionStart, area.selectionEnd).trim() ?? "";
    props.onDraft(fragment);
  };

  return (
    <section
      aria-busy={props.loading || undefined}
      data-testid="notes-editor-surface"
      className={`${props.hiddenOnMobile ? "hidden" : "flex"} min-h-[32rem] min-w-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-white/50 bg-white/70 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/10 lg:flex`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/70 px-4 py-3 dark:border-white/10 md:px-5">
        <button
          type="button"
          onClick={props.onBack}
          disabled={props.status === "saving"}
          className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10 lg:hidden"
        >
          <ArrowLeft size={18} className="mr-2" /> Назад к заметкам
        </button>

        <span
          role="status"
          className={`min-w-0 flex-1 text-xs ${props.status === "error" ? "text-rose-600 dark:text-rose-300" : props.status === "saved" ? "text-emerald-600 dark:text-emerald-300" : "text-slate-500"}`}
        >
          {props.status === "saved" && <Check className="mr-1 inline" size={14} />}
          {statusText}
        </span>

        {props.note && (
          <button
            type="button"
            onClick={props.onArchive}
            disabled={props.loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/10"
          >
            {props.note.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            {props.note.archived ? "Восстановить" : "В архив"}
          </button>
        )}
        <button
          type="button"
          onClick={props.onSave}
          disabled={props.loading || props.status === "saving" || (!props.title.trim() && !props.content.trim())}
          className="min-h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 px-4 text-sm font-bold text-white shadow-md shadow-indigo-950/10 transition hover:brightness-110 disabled:opacity-40"
        >
          Сохранить
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 p-4 md:p-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="flex min-h-[26rem] min-w-0 flex-col rounded-3xl border border-slate-200/70 bg-white/50 p-4 dark:border-white/10 dark:bg-slate-950/30 md:p-6">
          <div className="mb-4 flex items-center gap-3 text-xs font-semibold text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1.5 text-indigo-600 dark:text-indigo-300">
              <FileText size={14} /> Личная заметка
            </span>
            <span>{words} {wordLabel(words)}</span>
          </div>
          <input
            aria-label="Заголовок заметки"
            disabled={props.loading}
            value={props.title}
            onChange={(event) => props.onTitle(event.target.value)}
            maxLength={200}
            placeholder="Заголовок"
            className="mb-3 bg-transparent font-display text-2xl font-bold text-slate-950 outline-none placeholder:text-slate-400 disabled:opacity-50 dark:text-slate-50 md:text-3xl"
          />
          <textarea
            ref={textRef}
            aria-label="Текст заметки"
            disabled={props.loading}
            value={props.content}
            onChange={(event) => props.onContent(event.target.value)}
            maxLength={50000}
            placeholder="Запишите мысль, к которой хочется вернуться…"
            className="min-h-72 flex-1 resize-none bg-transparent py-2 text-[15px] leading-7 text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50 dark:text-slate-200 md:text-base"
          />
        </article>

        <aside aria-label="Контекст заметки" className="flex min-w-0 flex-col gap-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white/50 p-4 dark:border-white/10 dark:bg-slate-950/30">
            <h2 className="font-display text-lg font-bold">Контекст</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400"><CalendarClock size={14} /> Изменено</dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">{formatDate(props.note?.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Создано</dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">{formatDate(props.note?.createdAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-indigo-300/40 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 p-4 dark:border-indigo-400/20">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-200">
              <Sparkles size={17} />
              <h2 className="font-display font-bold">Из мысли в задачу</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
              {isGuest ? "AI недоступен в демо-режиме" : "Выделите фрагмент текста. Ассистент подготовит черновик, а сохранить его сможете только вы."}
            </p>
            <button
              type="button"
              disabled={isGuest || props.loading || !props.note}
              onClick={requestDraft}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-40"
            >
              <Sparkles size={16} /> Предложить задачу
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/50 p-4 dark:border-white/10 dark:bg-slate-950/30">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-bold">Связанные задачи</h2>
              <span className="rounded-full bg-slate-200/70 px-2 py-1 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">{props.note?.taskLinks.length ?? 0}</span>
            </div>

            {!!props.note?.taskLinks.length && (
              <div className="mt-3 space-y-2">
                {props.note.taskLinks.map(({ task }) => (
                  <div key={task.id} className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/45 px-2.5 py-2 text-sm dark:border-white/10 dark:bg-slate-950/25">
                    <Link2 size={14} className="shrink-0 text-indigo-400" />
                    <Link to={`/tasks?task=${task.id}`} className="min-w-0 flex-1 truncate hover:text-indigo-500">{task.title}</Link>
                    <button type="button" onClick={() => props.onUnlink(task.id)} aria-label={`Убрать связь с задачей «${task.title}»`} className="p-1 text-slate-400 hover:text-rose-500"><Unlink size={13} /></button>
                  </div>
                ))}
              </div>
            )}

            {props.note && availableTasks.length > 0 ? (
              <select
                aria-label="Связать с задачей"
                disabled={props.loading}
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) props.onLink(Number(event.target.value));
                  event.target.value = "";
                }}
                className="mt-3 min-h-11 w-full rounded-xl border border-slate-200 bg-white/55 px-3 text-sm outline-none focus:border-indigo-400 disabled:opacity-50 dark:border-white/10 dark:bg-slate-950/45"
              >
                <option value="">Связать с задачей…</option>
                {availableTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
              </select>
            ) : (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {props.note ? "Все доступные задачи уже связаны." : "Сначала сохраните заметку."}
              </p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
