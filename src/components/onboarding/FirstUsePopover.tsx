import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  type OnboardingHintId,
  useMarkOnboardingHintShown,
  useWasOnboardingHintShown,
} from "../../store/useSettingsStore";

interface FirstUsePopoverProps {
  id: OnboardingHintId;
  children: ReactNode;
  align?: "left" | "right";
}

const FirstUsePopover = ({ id, children, align = "left" }: FirstUsePopoverProps) => {
  const wasShown = useWasOnboardingHintShown(id);
  const markAsShown = useMarkOnboardingHintShown();
  const [isVisible, setIsVisible] = useState(() => !wasShown);

  useEffect(() => {
    if (!wasShown) {
      markAsShown(id);
    }
  }, [id, markAsShown, wasShown]);

  if (!isVisible) return null;

  return (
    <aside
      role="status"
      className={`absolute top-full z-30 mt-2 w-[min(19rem,calc(100vw-4rem))] rounded-xl border border-indigo-400/30 bg-slate-950 p-3 text-sm leading-5 text-slate-200 shadow-2xl shadow-slate-950/40 ${align === "right" ? "right-0" : "left-0"}`}
    >
      <span
        className={`absolute -top-1.5 h-3 w-3 rotate-45 border-l border-t border-indigo-400/30 bg-slate-950 ${align === "right" ? "right-5" : "left-5"}`}
        aria-hidden="true"
      />
      <div className="relative flex items-start gap-3">
        <p className="min-w-0 flex-1">{children}</p>
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          aria-label="Закрыть подсказку"
          title="Закрыть подсказку"
        >
          <X size={15} />
        </button>
      </div>
    </aside>
  );
};

export default FirstUsePopover;
