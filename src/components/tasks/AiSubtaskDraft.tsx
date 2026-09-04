import { LoaderCircle, Plus, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import AiApi from "../../api/AiApi";
import type { SubtaskDraftRequest } from "@glowy/contracts";

interface AiSubtaskDraftProps {
  task: SubtaskDraftRequest;
  onApply: (titles: string[]) => Promise<{ failed?: string[] } | void> | { failed?: string[] } | void;
}

const AiSubtaskDraft = ({ task, onApply }: AiSubtaskDraftProps) => {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const canRequest = Boolean(task.title.trim()) && !loading && !applying;

  const requestDraft = async () => {
    if (!task.title.trim()) {
      setOpen(true);
      setError("Сначала напиши название задачи.");
      return;
    }
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const response = await AiApi.createSubtaskDraft(task);
      setDrafts(response.subtasks.map((item) => item.title));
    } catch (requestError) {
      setDrafts([]);
      setError(requestError instanceof Error ? requestError.message : "Glowy не смог составить шаги. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    if (loading || applying) return;
    setOpen(false);
    setDrafts([]);
    setError("");
  };

  const apply = async () => {
    const normalized = drafts.map((title) => title.trim()).filter(Boolean);
    if (!normalized.length) {
      setError("Оставь хотя бы один шаг или отмени черновик.");
      return;
    }
    setApplying(true);
    setError("");
    try {
      const result = await onApply(normalized);
      const failed = result?.failed ?? [];
      if (failed.length) {
        setDrafts(failed);
        setError(`Добавлено не всё: осталось ${failed.length}. Можно повторить.`);
        return;
      }
      setOpen(false);
      setDrafts([]);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Не удалось применить шаги.");
    } finally {
      setApplying(false);
    }
  };

  if (!open) {
    return <button type="button" onClick={() => void requestDraft()} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-2 py-1 text-[11px] font-medium text-indigo-500 transition-colors hover:bg-indigo-500/10 dark:text-indigo-300 sm:text-xs"><Sparkles size={14} />AI шаги</button>;
  }

  return (
    <div className="w-full rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3" aria-label="Черновик подзадач Glowy AI">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300"><Sparkles size={14} />Черновик шагов</span>
        <button type="button" onClick={close} disabled={loading || applying} aria-label="Закрыть черновик" className="rounded p-1 text-slate-500 hover:bg-slate-500/10"><X size={14} /></button>
      </div>
      <p className="mb-3 text-[11px] leading-4 text-slate-500 dark:text-slate-400">Glowy ничего не сохранит, пока ты не подтвердишь список.</p>
      {loading ? <div className="flex items-center gap-2 py-3 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" />Составляю короткие шаги…</div> : (
        <div className="space-y-2">
          {drafts.map((title, index) => <div key={`${index}-${title}`} className="flex items-center gap-2"><input value={title} maxLength={160} aria-label={`Шаг ${index + 1}`} onChange={(event) => setDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" /><button type="button" onClick={() => setDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Удалить шаг ${index + 1}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-500"><Trash2 size={15} /></button></div>)}
          {drafts.length > 0 && drafts.length < 8 && <button type="button" onClick={() => setDrafts((current) => [...current, ""])} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-500"><Plus size={14} />Добавить свой шаг</button>}
        </div>
      )}
      {error && <p role="alert" className="mt-2 rounded-lg bg-red-500/10 px-2 py-1.5 text-xs text-red-600 dark:text-red-300">{error}</p>}
      {!loading && <div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => void requestDraft()} disabled={!canRequest} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-500/10"><RotateCcw size={14} />Составить заново</button><button type="button" onClick={() => void apply()} disabled={applying || !drafts.some((title) => title.trim())} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{applying ? "Добавляю…" : "Добавить шаги"}</button></div>}
    </div>
  );
};

export default AiSubtaskDraft;
