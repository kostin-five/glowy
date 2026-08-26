import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import type { TaskDraft } from "../../types";

type Props = { draft: TaskDraft | null; busy: boolean; onChange: (draft: TaskDraft) => void; onClose: () => void; onConfirm: () => void };

export default function NoteTaskDraftDialog({ draft, busy, onChange, onClose, onConfirm }: Props) {
  if (!draft) return null;
  return (
    <Dialog open onClose={busy ? () => undefined : onClose} className="relative z-50">
      <div className="fixed inset-0 bg-slate-950/60" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
          <DialogTitle className="font-display text-xl font-bold">Черновик задачи</DialogTitle>
          <p className="mt-1 text-sm text-slate-500">Проверь предложение. Задача появится только после подтверждения.</p>
          <div className="mt-5 space-y-3">
            <input aria-label="Заголовок задачи" value={draft.title} maxLength={255} onChange={(e) => onChange({ ...draft, title: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-transparent p-3 dark:border-slate-700" />
            <div className="grid grid-cols-2 gap-3">
              <input aria-label="Дата задачи" type="date" value={draft.date} onChange={(e) => onChange({ ...draft, date: e.target.value })} className="rounded-2xl border border-slate-200 bg-transparent p-3 dark:border-slate-700" />
              <select aria-label="Энергия задачи" value={draft.energyLevel} onChange={(e) => onChange({ ...draft, energyLevel: e.target.value as TaskDraft["energyLevel"] })} className="rounded-2xl border border-slate-200 bg-transparent p-3 dark:border-slate-700"><option value="low">Низкая энергия</option><option value="med">Средняя энергия</option><option value="high">Высокая энергия</option></select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" disabled={busy} onClick={onClose} className="rounded-xl px-4 py-2 font-bold text-slate-500">Отмена</button>
            <button type="button" disabled={busy || !draft.title.trim()} onClick={onConfirm} className="rounded-xl bg-indigo-500 px-4 py-2 font-bold text-white disabled:opacity-50">{busy ? "Создаём…" : "Создать задачу"}</button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
