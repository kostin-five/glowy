import { useState } from "react";
import { CalendarCheck2, LoaderCircle } from "lucide-react";
import type { DayPlanCandidate } from "../../dashboard/dayPlan";
import Modal from "../ui/Modal";

type DayPlanReviewDialogProps = {
  isOpen: boolean;
  candidates: DayPlanCandidate[];
  onClose: () => void;
  onApply: (selectedTaskIds: number[]) => Promise<number[]>;
  onApplied?: () => void;
};

const DayPlanReviewDialog = ({
  isOpen,
  candidates,
  onClose,
  onApply,
  onApplied,
}: DayPlanReviewDialogProps) => {
  const [reviewCandidates] = useState(candidates);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(reviewCandidates.map(({ task }) => task.id))
  );
  const [isApplying, setIsApplying] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  const close = () => {
    if (!isApplying) onClose();
  };

  const toggleTask = (taskId: number) => {
    setFailedCount(0);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const apply = async () => {
    const selected = [...selectedIds];
    if (selected.length === 0 || isApplying) return;

    setIsApplying(true);
    setFailedCount(0);
    try {
      const failedIds = await onApply(selected);
      if (failedIds.length > 0) {
        setSelectedIds(new Set(failedIds));
        setFailedCount(failedIds.length);
        return;
      }
      onApplied?.();
      onClose();
    } catch {
      setFailedCount(selected.length);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="План на сегодня" maxWidth="2xl">
      <p className="mb-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Проверь предложенную очередь. Пока ты не нажмёшь кнопку, задачи не изменятся.
      </p>

      <div className="space-y-3">
        {reviewCandidates.map((candidate, index) => {
          const checked = selectedIds.has(candidate.task.id);
          return (
            <label
              key={candidate.task.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 dark:border-slate-700 dark:bg-slate-950/40 dark:has-[:checked]:border-indigo-500 dark:has-[:checked]:bg-indigo-500/10"
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={isApplying}
                onChange={() => toggleTask(candidate.task.id)}
                aria-label={`Добавить в план: ${candidate.task.title}`}
                className="mt-1 h-5 w-5 shrink-0 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-wide text-indigo-500">
                  {index === 0 ? "Следующий шаг" : `Потом · шаг ${index + 1}`}
                </span>
                <span className="mt-1 block break-words font-semibold text-slate-900 dark:text-slate-100">
                  {candidate.task.title}
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-400">
                  {candidate.reason}
                </span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                  <CalendarCheck2 size={14} aria-hidden="true" />
                  {candidate.isToday ? "Уже на сегодня" : "Будет перенесена на сегодня"}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {failedCount > 0 && (
        <p role="alert" className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          Не удалось добавить: {failedCount}. Остальные изменения сохранены — можно повторить.
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={close}
          disabled={isApplying}
          className="min-h-11 rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={selectedIds.size === 0 || isApplying}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApplying && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
          {isApplying ? "Добавляю…" : failedCount > 0 ? "Повторить" : "Добавить в план"}
        </button>
      </div>
    </Modal>
  );
};

export default DayPlanReviewDialog;
