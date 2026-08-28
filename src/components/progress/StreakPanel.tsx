import {
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  onMonthChange: (month: string) => void;
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

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(
    new Date(`${month}-01T12:00:00`)
  );

const shiftMonth = (month: string, amount: number) => {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + amount);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const stateStyles = {
  active: "border-emerald-400/60 bg-emerald-400/20 text-emerald-700 dark:text-emerald-200",
  rescued: "border-indigo-400/60 bg-indigo-400/15 text-indigo-700 dark:text-indigo-200",
  missed: "border-rose-300/40 bg-rose-400/8 text-rose-500 dark:text-rose-300",
  today: "border-amber-400 bg-amber-400/15 text-amber-700 ring-2 ring-amber-300/30 dark:text-amber-200",
  future: "border-slate-200 bg-slate-100/50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/40",
  empty: "border-transparent text-slate-300 dark:text-slate-700",
} as const;

const StreakPanel = ({
  progress,
  isApplyingRescue,
  onUseRescue,
  onMonthChange,
}: StreakPanelProps) => {
  const eligibleDate = progress.taskStreak.missedDateEligibleForRescue;
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const previewAchievements = progress.achievements.slice(0, 4);
  const calendar = progress.taskStreak.calendar;

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
        <p className="text-sm font-semibold text-indigo-500 dark:text-indigo-300">Карта ритма</p>
        <div className="mt-5 flex items-end gap-3">
          <span className="font-display text-7xl font-black text-slate-900 dark:text-slate-100">{progress.taskStreak.current}</span>
          <span className="pb-3 text-lg text-slate-600 dark:text-slate-400">дней подряд</span>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Лучший результат: {progress.taskStreak.longest} дней</p>

        {calendar && (
          <div className="mt-5 min-w-0 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Предыдущий месяц"
                disabled={!calendar.canGoPrevious}
                onClick={() => onMonthChange(shiftMonth(calendar.month, -1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
              >
                <ChevronLeft size={18} />
              </button>
              <h3 className="text-center text-sm font-bold capitalize text-slate-900 dark:text-slate-100">
                {monthLabel(calendar.month)}
              </h3>
              <button
                type="button"
                aria-label="Следующий месяц"
                disabled={!calendar.canGoNext}
                onClick={() => onMonthChange(shiftMonth(calendar.month, 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-400" aria-hidden="true">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="mt-1 grid min-w-0 grid-cols-7 gap-1" aria-label="Календарь ритма">
              {calendar.days.map((day) => (
                <span
                  key={day.date}
                  title={`${formatDate(day.date)}: ${day.state}`}
                  aria-label={`${formatDate(day.date)}, ${day.state}`}
                  className={`flex aspect-square min-w-0 items-center justify-center rounded-lg border text-[11px] font-bold ${stateStyles[day.state]} ${day.inMonth ? '' : 'opacity-35'}`}
                >
                  {Number(day.date.slice(-2))}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400" aria-label="Обозначения календаря">
              <span>● Выполнено</span><span>◐ Спасено</span><span>○ Пропуск</span><span>◎ Сегодня</span>
            </div>
          </div>
        )}

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
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">Можно спасти только вчерашний день — {formatDate(eligibleDate)}. Это действие нельзя отменить.</p>
              <button type="button" onClick={() => void onUseRescue()} disabled={isApplyingRescue} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{isApplyingRescue ? "Восстанавливаю..." : "Использовать круг"}</button>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">Сейчас спасать нечего. Круг доступен только для вчерашнего пропуска, если позавчера серия ещё шла.</p>
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
