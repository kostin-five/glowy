import { useState } from "react";
import Modal from "../ui/Modal";

interface ActualTimePromptProps {
  isOpen: boolean;
  estimatedMinutes: number | null;
  onClose: () => void;
  onSave: (minutes: number) => Promise<void>;
}

const ActualTimePrompt = ({
  isOpen,
  estimatedMinutes,
  onClose,
  onSave,
}: ActualTimePromptProps) => {
  const [minutes, setMinutes] = useState(estimatedMinutes?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const parsedMinutes = Number(minutes);
  const isValid = Number.isInteger(parsedMinutes) && parsedMinutes >= 1 && parsedMinutes <= 1440;

  const save = async () => {
    if (!isValid || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(parsedMinutes);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Сколько времени заняло?">
      <div className="space-y-4">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
          Это поможет точнее увидеть нагрузку дня. Поле можно пропустить.
        </p>
        <input
          type="number"
          min="1"
          max="1440"
          inputMode="numeric"
          autoFocus
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void save();
            }
          }}
          placeholder="Минуты"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Пропустить
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!isValid || isSaving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Сохраняю..." : "Сохранить"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ActualTimePrompt;
