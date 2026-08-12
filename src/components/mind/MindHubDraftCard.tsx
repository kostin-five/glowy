import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { MindHubDraft } from "../../api/AiApi";

interface MindHubDraftCardProps {
  draft: MindHubDraft;
  onChange?: (draft: MindHubDraft) => void;
  onConfirm: (draft: MindHubDraft) => Promise<void>;
  onDismiss: () => void;
}

const MindHubDraftCard = ({
  draft,
  onChange,
  onConfirm,
  onDismiss,
}: MindHubDraftCardProps) => {
  const [editedDraft, setEditedDraft] = useState<MindHubDraft>(() => ({
    ...draft,
    subtasks: draft.subtasks.map((subtask) => ({ ...subtask })),
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [saveError, setSaveError] = useState("");
  const isTitleTooLong = editedDraft.title.length > 255;

  const updateField = <Key extends keyof MindHubDraft>(
    field: Key,
    value: MindHubDraft[Key]
  ) => {
    const nextDraft = { ...editedDraft, [field]: value };
    setEditedDraft(nextDraft);
    onChange?.(nextDraft);
    setSaveError("");
  };

  const updateStep = (index: number, title: string) => {
    const nextDraft = {
      ...editedDraft,
      subtasks: editedDraft.subtasks.map((subtask, subtaskIndex) =>
        subtaskIndex === index ? { ...subtask, title } : subtask
      ),
    };
    setEditedDraft(nextDraft);
    onChange?.(nextDraft);
    setSaveError("");
  };

  const removeStep = (index: number) => {
    const nextDraft = {
      ...editedDraft,
      subtasks: editedDraft.subtasks
        .filter((_, subtaskIndex) => subtaskIndex !== index)
        .map((subtask, position) => ({ ...subtask, position })),
    };
    setEditedDraft(nextDraft);
    onChange?.(nextDraft);
    setSaveError("");
  };

  const addStep = () => {
    if (editedDraft.subtasks.length >= 10) return;

    const nextDraft = {
      ...editedDraft,
      subtasks: [
        ...editedDraft.subtasks,
        {
          title: "",
          completed: false,
          position: editedDraft.subtasks.length,
        },
      ],
    };
    setEditedDraft(nextDraft);
    onChange?.(nextDraft);
    setSaveError("");
  };

  const handleConfirm = async () => {
    if (isSaving) return;

    const title = editedDraft.title.trim();
    if (!title) {
      setSaveError("Добавь название задачи");
      return;
    }
    if (title.length > 255) {
      setSaveError("Сократи название до 255 символов");
      return;
    }

    const seenStepTitles = new Set<string>();
    const normalizedSubtasks = editedDraft.subtasks
      .map((subtask) => subtask.title.trim())
      .filter((stepTitle) => {
        if (!stepTitle) return false;

        const duplicateKey = stepTitle.toLocaleLowerCase("ru");
        if (seenStepTitles.has(duplicateKey)) return false;

        seenStepTitles.add(duplicateKey);
        return true;
      })
      .map((stepTitle, position) => ({
        title: stepTitle,
        completed: false,
        position,
      }));

    const normalizedDraft: MindHubDraft = {
      title,
      date: editedDraft.date,
      priority: editedDraft.priority,
      category: editedDraft.category.trim() || "Быт",
      completed: false,
      energyLevel: editedDraft.energyLevel,
      subtasks: normalizedSubtasks,
    };

    setIsSaving(true);
    setSaveError("");

    try {
      await onConfirm(normalizedDraft);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить задачу. Попробуй ещё раз."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const priorityClassName = {
    "🔥 P1": "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200",
    "⚡️ P2": "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200",
    "💤 P3": "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200",
  }[editedDraft.priority];
  const energyClassName = {
    low: "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200",
    med: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200",
    high: "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200",
  }[editedDraft.energyLevel];

  return (
    <article className="rounded-2xl border border-indigo-300/60 bg-indigo-50/80 p-3 shadow-sm dark:border-indigo-400/25 dark:bg-indigo-500/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
            Черновик задачи
          </p>
          {isEditingDetails ? (
            <input
              aria-label="Название задачи"
              value={editedDraft.title}
              maxLength={255}
              onChange={(event) => updateField("title", event.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          ) : (
            <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
              {editedDraft.title}
            </h3>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsEditingDetails((current) => !current)}
          disabled={isSaving}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-indigo-600 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
          aria-label={isEditingDetails ? "Закончить редактирование" : "Редактировать задачу"}
          title={isEditingDetails ? "Готово" : "Редактировать"}
        >
          {isEditingDetails ? <Check size={16} /> : <Pencil size={16} />}
        </button>
      </div>

      {isEditingDetails && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Дата
            <input
              aria-label="Дата задачи"
              type="date"
              value={editedDraft.date}
              onChange={(event) => updateField("date", event.target.value)}
              disabled={isSaving}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Категория
            <input
              aria-label="Категория задачи"
              value={editedDraft.category}
              maxLength={100}
              onChange={(event) => updateField("category", event.target.value)}
              disabled={isSaving}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          Приоритет
          <select
            aria-label="Приоритет задачи"
            value={editedDraft.priority}
            onChange={(event) =>
              updateField("priority", event.target.value as MindHubDraft["priority"])
            }
            disabled={isSaving}
            className={`rounded-full border px-2 py-1 text-xs font-bold outline-none ${priorityClassName}`}
          >
            <option value="🔥 P1">Высокий</option>
            <option value="⚡️ P2">Средний</option>
            <option value="💤 P3">Низкий</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          Энергия
          <select
            aria-label="Энергозатратность задачи"
            value={editedDraft.energyLevel}
            onChange={(event) =>
              updateField("energyLevel", event.target.value as MindHubDraft["energyLevel"])
            }
            disabled={isSaving}
            className={`rounded-full border px-2 py-1 text-xs font-bold outline-none ${energyClassName}`}
          >
            <option value="low">Низкая</option>
            <option value="med">Средняя</option>
            <option value="high">Высокая</option>
          </select>
        </label>
      </div>

      <div className="mt-3 border-t border-indigo-200/70 pt-2 dark:border-indigo-400/15">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Подзадачи</p>
          <button
            type="button"
            onClick={addStep}
            disabled={isSaving || editedDraft.subtasks.length >= 10}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-indigo-600 transition hover:bg-white disabled:opacity-40 dark:text-indigo-300 dark:hover:bg-slate-800"
          >
            <Plus size={13} />
            Добавить
          </button>
        </div>
        <div className="space-y-1.5">
          {editedDraft.subtasks.map((subtask, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <span className="w-4 shrink-0 text-center text-xs text-slate-400">{index + 1}.</span>
              <input
                aria-label={`Подзадача ${index + 1}`}
                value={subtask.title}
                onChange={(event) => updateStep(index, event.target.value)}
                disabled={isSaving}
                className="min-w-0 flex-1 border-0 border-b border-transparent bg-transparent px-1 py-1 text-xs text-slate-800 outline-none transition focus:border-indigo-400 dark:text-slate-200"
              />
              <button
                type="button"
                aria-label={`Удалить подзадачу ${index + 1}`}
                title={`Удалить подзадачу ${index + 1}`}
                onClick={() => removeStep(index)}
                disabled={isSaving}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-100 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {editedDraft.subtasks.length === 0 && (
            <p className="py-1 text-xs text-slate-500 dark:text-slate-400">Подзадач пока нет</p>
          )}
        </div>
      </div>

      {saveError && (
        <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-300">
          {saveError}
        </p>
      )}
      {!saveError && isTitleTooLong && (
        <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-300">
          Сократи название до 255 символов
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onDismiss}
          disabled={isSaving}
          className="rounded-xl border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-400/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
        >
          Удалить
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSaving || !editedDraft.title.trim() || isTitleTooLong}
          className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? "Сохраняю…"
            : saveError
              ? "Повторить сохранение"
              : "Добавить задачу"}
        </button>
      </div>
    </article>
  );
};

export default MindHubDraftCard;
