import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tag, Check } from "lucide-react";
import { useIsAuthenticated, useIsGuest } from "../store/useAuthStore";
import { PaymentApi } from "../api/PaymentApi";
import { useStartRoute } from "../store/useSettingsStore";
import { trackProductEventOnce } from "../utils/analytics";

type CurrentPlan = {
  plan?: string;
  subscriptionStatus?: string;
  planExpiresAt?: string | null;
};

const PricingPage = () => {
  const navigate = useNavigate();
  const startRoute = useStartRoute();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuthenticated = useIsAuthenticated();
  const isGuest = useIsGuest();
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const hasActivatedFounderRef = useRef(false);
  const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === "true";


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

  const activateFounderPlan = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await PaymentApi.activateFounderPlan();
      setCurrentPlan(data);
      setSearchParams({}, { replace: true });
      navigate(startRoute, { replace: true });
    } catch {
      alert("Не удалось активировать тариф Founder. Попробуйте позже.");
    } finally {
      setIsLoading(false);
    }
  }, [navigate, setSearchParams, startRoute]);

  useEffect(() => {
    if (
      searchParams.get("activate") !== "founder" ||
      hasActivatedFounderRef.current ||
      !isAuthenticated ||
      isGuest ||
      isFounderActive
    ) {
      return;
    }

    hasActivatedFounderRef.current = true;
    activateFounderPlan();
  }, [activateFounderPlan, isAuthenticated, isFounderActive, isGuest, searchParams]);

  const handleFocusClick = async () => {
    if (!paymentsEnabled || isFocusActive || isLifetimeActive) return;

    if (!isAuthenticated || isGuest) {
      navigate("/login?redirect=/pricing");
      return;
    }

    try {
      setIsLoading(true);
      const { confirmationUrl } = await PaymentApi.createFocusPayment();
      if (confirmationUrl) {
        trackProductEventOnce("focus_checkout_started");
        window.location.href = confirmationUrl;
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

  const handleFounderClick = async () => {
    if (!paymentsEnabled || isFounderActive) return;

    if (!isAuthenticated || isGuest) {
      navigate(`/login?redirect=${encodeURIComponent("/pricing?activate=founder")}`);
      return;
    }

    await activateFounderPlan();
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
      name: "Founder",
      price: "0 ₽",
      period: "навсегда",
      features: [
        "Все функции Start",
        "100 AI-запросов в день",
        "Глубокий аналитический анализ",
        "Выбор тона общения Glowy",
        "Ранний доступ к новым функциям и обновлениям",
        "Для первых пользователей",
      ],
      cta: isFounderActive
        ? "Текущий тариф"
        : (paymentsEnabled ? "Получить Founder" : "Оформление отключено"),
      disabled: !paymentsEnabled || isFounderActive,
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
                {plan.name === "Founder" && plan.active && (
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
                    : plan.name === "Founder"
                      ? handleFounderClick
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
                {(plan.name === "Focus" || plan.name === "Founder") && isLoading
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
