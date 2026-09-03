import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Clock3,
  Copy,
  Flame,
  ListChecks,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  AnalyticsApi,
  type AnalyticsPeriodKind,
} from "../api/AnalyticsApi";
import { formatLocalDateOnly } from "../utils/localDate";
import { useAuthStore, useIsGuest } from "../store/useAuthStore";
import type { AnalyticsSnapshot } from "../types";
import FirstUsePopover from "../components/onboarding/FirstUsePopover";
import Modal from "../components/ui/Modal";
import SafeReportMarkdown from "../components/analytics/SafeReportMarkdown";
import {
  deleteAnalyticsReport,
  readAnalyticsReport,
  saveAnalyticsReport,
} from "../utils/analyticsReportStorage";

const tooltipStyles = {
  backgroundColor: "#0f172a",
  borderColor: "#334155",
  borderRadius: "8px",
  color: "#f8fafc",
};

const formatMinutes = (minutes: number) => {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
};

const formatChartDate = (date: string, kind: AnalyticsPeriodKind) => {
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    ...(kind === "week" ? { weekday: "short" as const } : {}),
  }).format(parsed);
};

const readApiError = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }
  return fallback;
};

const MetricCard = ({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof ListChecks;
  label: string;
  value: string;
  detail: string;
}) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70">
    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
      <Icon size={17} />
      <span className="text-xs font-semibold uppercase">{label}</span>
    </div>
    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-slate-100">
      {value}
    </p>
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
  </div>
);

const AnalyticsPage = () => {
  const isGuest = useIsGuest();
  const ownerId = useAuthStore((state) => state.userId);
  const [period, setPeriod] = useState<AnalyticsPeriodKind>("week");
  const anchor = formatLocalDateOnly();

  // All transient data belongs to one viewing context, even across A → B → A.
  return (
    <AnalyticsView
      key={`${ownerId}:${isGuest}:${period}:${anchor}`}
      ownerId={ownerId}
      isGuest={isGuest}
      period={period}
      anchor={anchor}
      changePeriod={setPeriod}
    />
  );
};

const AnalyticsView = ({ ownerId, isGuest, period, anchor, changePeriod }: {
  ownerId: number | null;
  isGuest: boolean;
  period: AnalyticsPeriodKind;
  anchor: string;
  changePeriod: (period: AnalyticsPeriodKind) => void;
}) => {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!isGuest);
  const [reportOverride, setReportOverride] = useState<{
    key: string;
    text: string | null;
  } | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState(false);
  const mounted = useRef(false);
  const insightPending = useRef(false);
  const snapshotPending = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const isCurrentView = useCallback(() => {
    const auth = useAuthStore.getState();
    return mounted.current && auth.userId === ownerId && auth.isGuest === isGuest;
  }, [isGuest, ownerId]);

  const retrySnapshot = useCallback(async () => {
    if (isGuest || snapshotPending.current || !isCurrentView()) return;
    snapshotPending.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const data = await AnalyticsApi.getSnapshot(period, anchor);
      if (isCurrentView()) setSnapshot(data);
    } catch (requestError) {
      if (isCurrentView()) setError(readApiError(requestError, "Не удалось загрузить аналитику."));
    } finally {
      snapshotPending.current = false;
      if (isCurrentView()) setIsLoading(false);
    }
  }, [anchor, isGuest, isCurrentView, period]);

  useEffect(() => {
    if (isGuest) return;

    let active = true;
    AnalyticsApi.getSnapshot(period, anchor)
      .then((data) => {
        if (!active || !isCurrentView()) return;
        setSnapshot(data);
        setError(null);
      })
      .catch((requestError) => {
        if (!active || !isCurrentView()) return;
        setError(readApiError(requestError, "Не удалось загрузить аналитику."));
      })
      .finally(() => {
        if (active && isCurrentView()) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [anchor, isGuest, isCurrentView, period]);

  const chartData = useMemo(
    () =>
      snapshot?.dailyCompleted.map((item) => ({
        ...item,
        label: formatChartDate(item.date, period),
      })) || [],
    [period, snapshot]
  );
  const energyData = useMemo(
    () =>
      snapshot
        ? [
            { name: "Низкая", value: snapshot.energyDistribution.low, color: "#3b82f6" },
            { name: "Средняя", value: snapshot.energyDistribution.med, color: "#eab308" },
            { name: "Высокая", value: snapshot.energyDistribution.high, color: "#ef4444" },
          ].filter((item) => item.value > 0)
        : [],
    [snapshot]
  );
  const reportIdentity = useMemo(() => {
    if (!ownerId || !snapshot || snapshot.period.kind !== period) return null;
    return {
      ownerId,
      period,
      from: snapshot.period.from,
      to: snapshot.period.to,
    };
  }, [ownerId, period, snapshot]);
  const reportIdentityKey = reportIdentity
    ? `${reportIdentity.ownerId}:${reportIdentity.period}:${reportIdentity.from}:${reportIdentity.to}`
    : "";
  const storedInsight = useMemo(
    () => reportIdentity ? readAnalyticsReport(reportIdentity)?.text ?? null : null,
    [reportIdentity]
  );
  const insight = reportOverride?.key === reportIdentityKey
    ? reportOverride.text
    : storedInsight;

  const requestInsight = async () => {
    if (!snapshot?.canRequestAiInsight || insightPending.current || !isCurrentView()) return;
    insightPending.current = true;
    setIsInsightLoading(true);
    setError(null);
    try {
      const result = await AnalyticsApi.requestInsight(period, anchor);
      if (!isCurrentView()) return;
      setReportOverride({ key: reportIdentityKey, text: result.insight });
      if (reportIdentity) saveAnalyticsReport(reportIdentity, result.insight);
    } catch (requestError) {
      if (isCurrentView()) setError(
        readApiError(requestError, "Glowy не смог подготовить вывод. Попробуй позже.")
      );
    } finally {
      insightPending.current = false;
      if (isCurrentView()) setIsInsightLoading(false);
    }
  };

  const copyInsight = async () => {
    if (!insight) return;
    try {
      await navigator.clipboard.writeText(insight);
      if (isCurrentView()) setCopyFeedback("Отчёт скопирован");
    } catch {
      if (isCurrentView()) setCopyFeedback("Не удалось скопировать отчёт");
    }
  };

  const deleteInsight = () => {
    if (insightPending.current) return;
    if (reportIdentity) deleteAnalyticsReport(reportIdentity);
    setReportOverride({ key: reportIdentityKey, text: null });
    setCopyFeedback(null);
  };

  if (isGuest) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 pb-28 md:px-8 lg:pb-8">
        <h1 className="font-display text-3xl font-bold text-slate-950 dark:text-slate-100">
          Твоя аналитика
        </h1>
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            Аналитика сохраняется в аккаунте
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Войди, чтобы видеть стрик, время и динамику выполненных задач между устройствами.
          </p>
          <Link className="mt-4 inline-flex text-sm font-bold text-indigo-500" to="/login">
            Войти в аккаунт
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-3 pb-28 sm:px-4 md:px-8 lg:pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-slate-100 sm:text-3xl">
            Твоя аналитика
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Короткая картина ритма по реально выполненным задачам.
          </p>
        </div>
        <div className="relative grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {(["week", "month"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => changePeriod(value)}
              className={`h-9 px-4 text-sm font-semibold transition-colors ${
                period === value
                  ? "rounded-md bg-indigo-500 text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {value === "week" ? "Неделя" : "Месяц"}
            </button>
          ))}
          <FirstUsePopover id="analyticsPeriod" align="right">
            Переключай неделю и месяц. Глубокий AI-разбор запускается отдельно и не строится без твоего действия.
          </FirstUsePopover>
        </div>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          {!snapshot && !isLoading && (
            <button
              type="button"
              onClick={() => void retrySnapshot()}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-rose-400/40 px-4 py-2 text-sm font-bold transition-colors hover:bg-rose-500/10"
            >
              Повторить
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div
          className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-indigo-300/70 bg-white px-6 text-center dark:border-indigo-500/30 dark:bg-slate-900/60"
          role="status"
          aria-live="polite"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
            <LoaderCircle className="animate-spin" size={24} />
          </span>
          <p className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Собираю картину периода
          </p>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            Считаю выполненные задачи, время и ритм без лишнего шума.
          </p>
        </div>
      ) : snapshot ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              icon={ListChecks}
              label="Выполнено"
              value={String(snapshot.completedTasks)}
              detail={period === "week" ? "за эту неделю" : "за этот месяц"}
            />
            <MetricCard
              icon={Flame}
              label="Стрик побед"
              value={`${snapshot.taskStreak} дн.`}
              detail="по дням с выполненными задачами"
            />
            <MetricCard
              icon={Clock3}
              label="Фактически"
              value={formatMinutes(snapshot.time.actualMinutes)}
              detail={`указано в ${snapshot.time.tasksWithActual} задачах`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70 md:p-6">
              <h2 className="font-display text-base font-bold text-slate-950 dark:text-slate-100">
                Выполненные задачи
              </h2>
              <div className="mt-4 h-64">
                {snapshot.hasActivity ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={0}
                    initialDimension={{ width: 320, height: 256 }}
                  >
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid stroke="#334155" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyles} cursor={false} />
                      <Bar dataKey="completedTasks" name="Выполнено" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Здесь появится динамика после первой выполненной задачи.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70 md:p-6">
              <h2 className="font-display text-base font-bold text-slate-950 dark:text-slate-100">
                Энергия выполненных задач
              </h2>
              <div className="mt-4 h-64">
                {energyData.length ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={0}
                    initialDimension={{ width: 320, height: 256 }}
                  >
                    <PieChart>
                      <Pie data={energyData} dataKey="value" innerRadius="36%" outerRadius="58%" stroke="none">
                        {energyData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyles} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
                    Пока нечего распределять.
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70 md:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Плановое время</p>
                <p className="mt-2 text-xl font-bold text-slate-950 dark:text-slate-100">{formatMinutes(snapshot.time.estimatedMinutes)}</p>
                <p className="mt-1 text-xs text-slate-500">в {snapshot.time.tasksWithEstimate} задачах</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Фактическое время</p>
                <p className="mt-2 text-xl font-bold text-slate-950 dark:text-slate-100">{formatMinutes(snapshot.time.actualMinutes)}</p>
                <p className="mt-1 text-xs text-slate-500">в {snapshot.time.tasksWithActual} задачах</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4 md:p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 shrink-0 text-indigo-500" size={20} />
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-950 dark:text-slate-100">Глубокий разбор Glowy</h2>
                {isInsightLoading && (
                  <div role="status" aria-live="polite" className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    <p className="flex items-center gap-2 font-semibold">
                      <LoaderCircle size={16} className="shrink-0 animate-spin" />
                      Готовлю глубокий разбор…
                    </p>
                    <p className="mt-1 text-xs leading-5">
                      Уход со страницы или смена периода не отменяет уже отправленный AI-запрос и его расход лимита.
                    </p>
                  </div>
                )}
                {insight ? (
                  <div className="mt-3">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={copyInsight}
                        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-indigo-500/30 px-3 py-2 text-sm font-bold text-indigo-600 dark:text-indigo-300"
                      >
                        <Copy size={16} />
                        Копировать
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRegenerateConfirmOpen(true)}
                        disabled={isInsightLoading || !snapshot.canRequestAiInsight}
                        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        <RotateCcw size={16} />
                        Новый отчёт
                      </button>
                      <button
                        type="button"
                        onClick={deleteInsight}
                        disabled={isInsightLoading}
                        className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-rose-600 disabled:opacity-50 dark:text-rose-300"
                      >
                        <Trash2 size={16} />
                        Удалить отчёт
                      </button>
                      {copyFeedback && (
                        <span className="text-sm text-slate-600 dark:text-slate-400" role="status">
                          {copyFeedback}
                        </span>
                      )}
                    </div>
                    <SafeReportMarkdown text={insight} />
                  </div>
                ) : !snapshot.canUseFocusFeatures ? (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Глубокий AI-разбор доступен в Focus и Forever.</p>
                ) : !snapshot.hasActivity ? (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Выполни хотя бы одну задачу за период, чтобы получить разбор.</p>
                ) : (
                  <div className="mt-2">
                    <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">
                      Glowy использует только сводные показатели периода, без названий задач и текста заметок.
                    </p>
                    <button
                      type="button"
                      onClick={requestInsight}
                      disabled={isInsightLoading}
                      className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-indigo-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {isInsightLoading
                        ? "Готовлю глубокий разбор..."
                        : period === "month"
                          ? "Разобрать месяц · 10 запросов"
                          : "Разобрать неделю · 5 запросов"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Аналитика пока недоступна.
        </div>
      )}
      <Modal
        isOpen={isRegenerateConfirmOpen}
        onClose={() => setIsRegenerateConfirmOpen(false)}
        title="Сделать новый отчёт?"
      >
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          Новый разбор потратит ещё {period === "month" ? "10" : "5"} AI-запросов. Текущий отчёт заменится только после успешного ответа Glowy.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setIsRegenerateConfirmOpen(false)}
            className="min-h-10 rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegenerateConfirmOpen(false);
              void requestInsight();
            }}
            className="min-h-10 rounded-md bg-indigo-500 px-4 py-2 text-sm font-bold text-white"
          >
            Сделать новый
          </button>
        </div>
      </Modal>
    </section>
  );
};

export default AnalyticsPage;
