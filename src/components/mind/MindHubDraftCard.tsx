import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import type { MindHubDraft } from "../../api/AiApi";

interface MindHubDraftCardProps {
  draft: MindHubDraft;
  onConfirm: (draft: MindHubDraft) => Promise<void>;
  onDismiss: () => void;
}

const MindHubDraftCard = ({
  draft,
  onConfirm,
  onDismiss,
}: MindHubDraftCardProps) => {
  const [editedDraft, setEditedDraft] = useState<MindHubDraft>(() => ({
    ...draft,
    subtasks: draft.subtasks.map((subtask) => ({ ...subtask })),
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const isTitleTooLong = editedDraft.title.length > 255;

  const updateField = <Key extends keyof MindHubDraft>(
    field: Key,
    value: MindHubDraft[Key]
  ) => {
    setEditedDraft((current) => ({ ...current, [field]: value }));
    setSaveError("");
  };

  const updateStep = (index: number, title: string) => {
    setEditedDraft((current) => ({
      ...current,
      subtasks: current.subtasks.map((subtask, subtaskIndex) =>
        subtaskIndex === index ? { ...subtask, title } : subtask
      ),
    }));
    setSaveError("");
  };

  const removeStep = (index: number) => {
    setEditedDraft((current) => ({
      ...current,
      subtasks: current.subtasks.filter((_, subtaskIndex) => subtaskIndex !== index),
    }));
    setSaveError("");
  };

  const addStep = () => {
    if (editedDraft.subtasks.length >= 10) return;

    setEditedDraft((current) => ({
      ...current,
      subtasks: [
        ...current.subtasks,
        {
          title: "",
          completed: false,
          position: current.subtasks.length,
        },
      ],
    }));
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

  return (
    <article className="rounded-2xl border border-indigo-300/60 bg-indigo-50/80 p-4 shadow-sm dark:border-indigo-400/25 dark:bg-indigo-500/10">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Sparkles size={16} />
        </span>
        <div>
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
            Черновик задачи
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
            Проверь детали. Задача появится в списке только после подтверждения.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Название
          <input
            aria-label="Название задачи"
            value={editedDraft.title}
            maxLength={255}
            onChange={(event) => updateField("title", event.target.value)}
            disabled={isSaving}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Дата
            <input
              aria-label="Дата задачи"
              type="date"
              value={editedDraft.date}
              onChange={(event) => updateField("date", event.target.value)}
              disabled={isSaving}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Категория
            <input
              aria-label="Категория задачи"
              value={editedDraft.category}
              maxLength={100}
              onChange={(event) => updateField("category", event.target.value)}
              disabled={isSaving}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Приоритет
            <select
              aria-label="Приоритет задачи"
              value={editedDraft.priority}
              onChange={(event) =>
                updateField(
                  "priority",
                  event.target.value as MindHubDraft["priority"]
                )
              }
              disabled={isSaving}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="🔥 P1">Высокий</option>
              <option value="⚡️ P2">Средний</option>
              <option value="💤 P3">Низкий</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Энергия
            <select
              aria-label="Энергия задачи"
              value={editedDraft.energyLevel}
              onChange={(event) =>
                updateField(
                  "energyLevel",
                  event.target.value as MindHubDraft["energyLevel"]
                )
              }
              disabled={isSaving}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="low">Низкая</option>
              <option value="med">Средняя</option>
              <option value="high">Высокая</option>
            </select>
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Шаги
            </p>
            <button
              type="button"
              onClick={addStep}
              disabled={isSaving || editedDraft.subtasks.length >= 10}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-40 dark:text-indigo-300 dark:hover:bg-indigo-400/10"
            >
              <Plus size={14} />
              Добавить шаг
            </button>
          </div>

          <div className="space-y-2">
            {editedDraft.subtasks.map((subtask, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  aria-label={`Шаг ${index + 1}`}
                  value={subtask.title}
                  onChange={(event) => updateStep(index, event.target.value)}
                  disabled={isSaving}
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  aria-label={`Удалить шаг ${index + 1}`}
                  title={`Удалить шаг ${index + 1}`}
                  onClick={() => removeStep(index)}
                  disabled={isSaving}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-100 hover:text-rose-600 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
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

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onDismiss}
          disabled={isSaving}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Не сохранять
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSaving || !editedDraft.title.trim() || isTitleTooLong}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? "Сохраняю…"
            : saveError
              ? "Повторить сохранение"
              : "Создать задачу"}
        </button>
      </div>
    </article>
  );
};

export default MindHubDraftCard;
