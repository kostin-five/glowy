import {
  CalendarCheck,
  CheckCircle2,
  Crown,
  Flame,
  Gauge,
  Layers3,
  Medal,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Trophy,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import type { Achievement, ProgressOverview } from "../../types";
import Modal from "../ui/Modal";
import FirstUsePopover from "../onboarding/FirstUsePopover";

interface StreakPanelProps {
  progress: ProgressOverview;
  isApplyingRescue: boolean;
  onUseRescue: () => Promise<void>;
}

const iconCatalog: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  sparkles: Sparkles,
  "check-circle": CheckCircle2,
  medal: Medal,
  gauge: Gauge,
  trophy: Trophy,
  flame: Flame,
  "calendar-check": CalendarCheck,
  sun: Sun,
  crown: Crown,
  sprout: Sprout,
  layers: Layers3,
  repeat: Repeat2,
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(
    new Date(`${value}T12:00:00`)
  );

const StreakPanel = ({ progress, isApplyingRescue, onUseRescue }: StreakPanelProps) => {
  const eligibleDate = progress.taskStreak.missedDateEligibleForRescue;
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const previewAchievements = progress.achievements.slice(0, 4);

  const renderAchievement = (achievement: Achievement) => {
    const Icon = iconCatalog[achievement.icon] ?? Trophy;
    const percent = Math.min(100, (achievement.current / achievement.target) * 100);

    return (
      <button
        key={achievement.key}
        type="button"
        onClick={() => {
          setIsAchievementsOpen(false);
          setSelectedAchievement(achievement);
        }}
        className={`flex min-h-44 flex-col rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${achievement.earned ? "border-amber-400/40 bg-amber-400/10" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"}`}
      >
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${achievement.earned ? "bg-amber-400/20 text-amber-500" : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
            <Icon size={20} />
          </span>
          <p className="line-clamp-2 font-semibold text-slate-900 dark:text-slate-100">{achievement.title}</p>
        </div>
        <p className="mt-3 line-clamp-2 min-h-10 text-sm text-slate-600 dark:text-slate-400">{achievement.earned ? "Получено" : achievement.description}</p>
        <div className="mt-auto pt-3">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={`h-full rounded-full ${achievement.earned ? "bg-amber-400" : "bg-indigo-500"}`} style={{ width: `${percent}%` }} /></div>
          <p className="mt-1 text-right text-xs font-bold text-slate-500 dark:text-slate-400">{achievement.current}/{achievement.target}</p>
        </div>
      </button>
    );
  };

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
        <p className="text-sm font-semibold text-indigo-500 dark:text-indigo-300">Стрик выполненных задач</p>
        <div className="mt-5 flex items-end gap-3">
          <span className="font-display text-7xl font-black text-slate-900 dark:text-slate-100">{progress.taskStreak.current}</span>
          <span className="pb-3 text-lg text-slate-600 dark:text-slate-400">дней подряд</span>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Лучший результат: {progress.taskStreak.longest} дней</p>

        <div className="mt-5 flex flex-wrap gap-2" aria-label="Дни текущего стрика">
          {progress.taskStreak.days.length > 0 ? progress.taskStreak.days.map((date) => (
            <span key={date} className="inline-flex min-w-16 flex-col items-center rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-amber-700 dark:text-amber-200">
              <Flame size={16} />
              <span className="mt-1 text-xs font-bold">{formatDate(date)}</span>
            </span>
          )) : <span className="text-sm text-slate-500 dark:text-slate-400">Выполни задачу сегодня, чтобы начать серию.</span>}
        </div>

        <div className="mt-8 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-indigo-400" size={24} />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Спасательные круги</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Осталось {progress.rescues.remaining} из {progress.rescues.monthlyLimit} в этом месяце</p>
            </div>
          </div>
          {eligibleDate && progress.rescues.remaining > 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">Можно восстановить стрик за {formatDate(eligibleDate)}. Это действие нельзя отменить.</p>
              <button type="button" onClick={() => void onUseRescue()} disabled={isApplyingRescue} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{isApplyingRescue ? "Восстанавливаю..." : "Использовать круг"}</button>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">Сейчас восстанавливать нечего. Круг появится, если один пропущенный день разделит серию.</p>
          )}
        </div>
      </section>

      <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none lg:h-[34rem]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><Trophy className="text-amber-400" size={24} /><h2 className="font-display text-2xl font-black text-slate-900 dark:text-slate-100">Достижения</h2></div>
          {progress.achievements.length > previewAchievements.length && (
            <button type="button" onClick={() => setIsAchievementsOpen(true)} className="rounded-xl border border-indigo-400/30 px-3 py-2 text-sm font-bold text-indigo-500 transition-colors hover:bg-indigo-500/10 dark:text-indigo-300">Показать все</button>
          )}
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
          {previewAchievements.map(renderAchievement)}
          <FirstUsePopover id="achievementDetails" align="right">
            Нажми на достижение, чтобы увидеть условие, текущий прогресс и
            короткое пояснение.
          </FirstUsePopover>
        </div>
      </section>

      <Modal isOpen={isAchievementsOpen} onClose={() => setIsAchievementsOpen(false)} title="Все достижения" maxWidth="2xl">
        <p className="mb-5 text-sm leading-6 text-slate-600 dark:text-slate-400">Открывай достижения в своём темпе. Нажми на карточку, чтобы увидеть подробности.</p>
        <div className="grid gap-3 sm:grid-cols-2">{progress.achievements.map(renderAchievement)}</div>
      </Modal>

      <Modal isOpen={Boolean(selectedAchievement)} onClose={() => setSelectedAchievement(null)} title={selectedAchievement?.title ?? "Достижение"}>
        {selectedAchievement && (() => {
          const Icon = iconCatalog[selectedAchievement.icon] ?? Trophy;
          return <div className="text-center"><span className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl ${selectedAchievement.earned ? "bg-amber-400/15 text-amber-500" : "bg-indigo-500/10 text-indigo-400"}`}><Icon size={30} /></span><p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">{selectedAchievement.description}</p><p className="mt-3 font-semibold text-slate-900 dark:text-slate-100">{selectedAchievement.encouragement}</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, (selectedAchievement.current / selectedAchievement.target) * 100)}%` }} /></div><p className="mt-2 text-sm font-bold text-slate-500">{selectedAchievement.current} из {selectedAchievement.target}</p></div>;
        })()}
      </Modal>
    </div>
  );
};

export default StreakPanel;
