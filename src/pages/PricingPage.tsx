import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Check } from "lucide-react";
import { useIsAuthenticated, useIsGuest } from "../store/useAuthStore";
import { PaymentApi } from "../api/PaymentApi";
import { trackProductEventOnce } from "../utils/analytics";
import useNetworkStatus from "../hooks/useNetworkStatus";
import { useTelegramMiniApp } from "../telegram/telegramMiniAppContext";
import { openTelegramExternalLink } from "../telegram/telegramExternalLink";

type CurrentPlan = {
  plan?: string;
  subscriptionStatus?: string;
  planExpiresAt?: string | null;
};

const PricingPage = () => {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const isGuest = useIsGuest();
  const isOnline = useNetworkStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === "true";
  const { isTelegramMiniApp, webApp } = useTelegramMiniApp();


  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      PaymentApi.getCurrentPlan()
        .then((data) => setCurrentPlan(data))
        .catch(() => {});
    }
  }, [isAuthenticated, isGuest]);

  const isFocusActive = Boolean(currentPlan &&
    currentPlan.plan === "focus" &&
    currentPlan.subscriptionStatus === "active" &&
    currentPlan.planExpiresAt &&
    new Date(currentPlan.planExpiresAt) > new Date());

  const isFounderActive = Boolean(currentPlan &&
    currentPlan.plan === "founder" &&
    currentPlan.subscriptionStatus === "active");
  const isLifetimeActive = isFounderActive;
  const isStartActive = !isFocusActive && !isLifetimeActive;

  const handleFocusClick = async () => {
    if (!paymentsEnabled || isFocusActive || isLifetimeActive) return;

    if (!isAuthenticated || isGuest) {
      navigate("/login?redirect=/pricing");
      return;
    }

    if (!isOnline) {
      alert("Для оформления тарифа нужно подключение к интернету.");
      return;
    }

    try {
      setIsLoading(true);
      const { confirmationUrl } = await PaymentApi.createFocusPayment();
      if (confirmationUrl) {
        trackProductEventOnce("focus_checkout_started");
        if (isTelegramMiniApp) {
          if (!openTelegramExternalLink(confirmationUrl, webApp)) {
            alert("Не удалось безопасно открыть страницу оплаты.");
          }
        } else {
          window.location.href = confirmationUrl;
        }
      } else {
        alert("Не удалось получить ссылку на оплату. Попробуйте позже.");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "code" in error.response.data &&
        error.response.data.code === "FOCUS_ALREADY_ACTIVE"
          ? "У вас уже активен тариф Focus. Обновляем статус тарифа."
          : "Не удалось создать платеж. Попробуйте позже.";

      alert(message);

      if (message.includes("уже активен")) {
        PaymentApi.getCurrentPlan()
          .then((data) => setCurrentPlan(data))
          .catch(() => {});
      }
    } finally {
      setIsLoading(false);
    }
  };

  const plans = [
    {
      name: "Start",
      price: "0 ₽",
      period: "всегда",
      features: [
        "10 AI-запросов в день",
        "Сохранение задач и прогресса",
        "Разгрузка мыслей",
        "Аналитика дня",
      ],
      cta: isStartActive ? "Текущий тариф" : "Включён в тариф",
      disabled: true,
      active: isStartActive,
    },
    {
      name: "Focus",
      price: "99 ₽",
      period: "в месяц",
      features: [
        "Все функции Start",
        "100 AI-запросов в день",
        "Глубокий аналитический анализ",
        "Выбор тона общения Glowy",
        "Ранний доступ к новым функциям и обновлениям",
      ],
      cta: isFocusActive
        ? "Текущий тариф"
        : isLifetimeActive
          ? "Включён в пожизненный тариф"
          : (paymentsEnabled ? "Оформить Focus" : "Оплата подключается"),
      highlight: true,
      disabled: !paymentsEnabled || isFocusActive || isLifetimeActive,
      active: isFocusActive,
      expiresAt: currentPlan?.planExpiresAt,
    },
    {
      name: "Forever",
      price: "—",
      period: "пожизненно",
      features: [
        "Все функции Start",
        "100 AI-запросов в день",
        "Глубокий аналитический анализ",
        "Выбор тона общения Glowy",
        "Ранний доступ к новым функциям и обновлениям",
        "Пожизненный доступ после запуска",
      ],
      cta: "Скоро",
      disabled: true,
      active: isLifetimeActive,
      accent: true,
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 sm:py-10">
      <article className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex cursor-pointer text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200"
        >
          ← Вернуться
        </button>

        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
            <Tag size={24} />
          </div>
          <h1 className="font-display text-3xl font-black sm:text-4xl">
            Тарифы и лимиты
          </h1>
          <p className="mt-4 text-slate-400">
            Выберите подходящий уровень возможностей для вашего спокойного планирования
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border p-6 ${
                plan.highlight || plan.active
                  ? "border-indigo-500 bg-indigo-500/5 shadow-[0_0_40px_rgba(79,70,229,0.15)]"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-1 text-xs font-bold text-white">
                  Популярный
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-slate-400">/ {plan.period}</span>
                </div>
                {plan.active && plan.expiresAt && (
                  <p className="mt-2 text-sm text-indigo-400">
                    Активен до {new Date(plan.expiresAt).toLocaleDateString("ru-RU")}
                  </p>
                )}
                {plan.name === "Forever" && plan.active && (
                  <p className="mt-2 text-sm text-indigo-400">
                    Активен бессрочно
                  </p>
                )}
              </div>
              <ul className="mb-8 flex-1 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check size={16} className="mt-0.5 shrink-0 text-indigo-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                disabled={plan.disabled || (plan.name === "Focus" && isLoading)}
                onClick={
                  plan.name === "Focus"
                    ? handleFocusClick
                    : undefined
                }
                className={`w-full rounded-2xl py-3 text-sm font-bold transition-all ${
                  plan.highlight || (plan.accent && !plan.disabled)
                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                    : plan.active
                      ? "bg-indigo-600/80 text-white"
                      : "bg-slate-800 text-slate-300"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {plan.name === "Focus" && isLoading
                  ? "Загрузка..."
                  : plan.cta}
              </button>
            </div>
          ))}
        </div>
      </article>
    </main>
  );
};

export default PricingPage;
