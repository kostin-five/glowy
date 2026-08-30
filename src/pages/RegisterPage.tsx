import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { AuthApi } from "../api/AuthApi";
import { TelegramMiniAppApi } from "../api/TelegramMiniAppApi";
import axios from "axios";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import AuthLoader from "../components/ui/AuthLoader";
import { useToLogin } from "../store/useAuthStore";
import { useStartRoute } from "../store/useSettingsStore";
import { trackProductEventOnce } from "../utils/analytics";
import { openTelegramExternalLink } from "../telegram/telegramExternalLink";
import { useTelegramMiniApp } from "../telegram/telegramMiniAppContext";
import { allowTelegramMiniAppAutoRestore } from "../telegram/telegramMiniAppSession";

const RegisterPage = () => {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = useMemo(() => {
    const r = searchParams.get("redirect");
    return r && r.startsWith("/") && !r.startsWith("//") ? r : null;
  }, [searchParams]);
  const [showPassword, setShowPassword] = useState(false);
  const toLogin = useToLogin();
  const startRoute = useStartRoute();
  const { isTelegramMiniApp, webApp } = useTelegramMiniApp();
  const telegramInitData = isTelegramMiniApp ? webApp?.initData.trim() || "" : "";

  const handleLegalLink = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!telegramInitData) return;
    event.preventDefault();
    openTelegramExternalLink(event.currentTarget.href, webApp);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      return setError("Пароль должен быть не менее 8 символов");
    }

    if (password !== confirmPassword) {
      return setError("Пароли не совпадают!");
    }

    setIsLoading(true);
    trackProductEventOnce("signup_started");

    try {
      const data = telegramInitData
        ? await TelegramMiniAppApi.register({
            initData: telegramInitData,
            name,
            email,
            password,
          })
        : await AuthApi.registerRequest({ name, email, password });
      if (telegramInitData) {
        allowTelegramMiniAppAutoRestore();
      }
      toLogin(data.id, data.name || name, data.email || email);
      trackProductEventOnce("signup_completed");
      navigate(redirect || startRoute);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const serverError =
          e.response?.data?.error ||
          e.response?.data?.message ||
          "Сервер недоступен (проверь терминал бэкенда)";

        setError(serverError);
      } else {
        setError("Что-то пошло не так");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden py-6 px-4">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 max-w-sm w-full flex flex-col items-center"
      >
        <div className="w-18 h-16 rounded-3xl hidden sm:flex items-center justify-center mb-4">
          <img src="/Glowy.png" alt="Glowy Logo" className="w-18 h-18" />
        </div>

        <h1 className="font-display text-2xl md:text-3xl font-black text-white tracking-tight mb-1 text-center">
          Начать путь с{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-cyan-400">
            Glowy
          </span>
        </h1>
        <p className="text-slate-400 text-sm mb-6 text-center px-4">
          Создай аккаунт, чтобы сохранять свои задачи и отслеживать прогресс
          энергии.
        </p>

        <form
          onSubmit={handleRegister}
          className="w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-5 sm:p-6 rounded-3xl flex flex-col gap-3.5 shadow-2xl"
        >
          <div>
            <label
              htmlFor="register-name"
              className="block text-slate-300 text-sm font-medium mb-2 pl-1"
            >
              Ваше имя
            </label>
            <input
              id="register-name"
              type="text"
              placeholder="Напишите имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 px-3 py-2 sm:px-4 sm:py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
              required
            />
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="block text-slate-300 text-sm font-medium mb-2 pl-1"
            >
              Почта
            </label>
            <input
              id="register-email"
              type="email"
              placeholder="Введите почту"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 px-3 py-2 sm:px-4 sm:py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
              required
            />
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="block text-slate-300 text-sm font-medium mb-2 pl-1"
            >
              Пароль (минимум 8 символов)
            </label>
            <div className="relative">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 px-3 py-2 sm:px-4 sm:py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="register-confirm-password"
              className="block text-slate-300 text-sm font-medium mb-2 pl-1"
            >
              Подтвердите пароль
            </label>
            <div className="relative">
            <input
              id="register-confirm-password"
              type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 px-3 py-2 sm:px-4 sm:py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !hasAcceptedLegal}
            className="w-full mt-2 bg-linear-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center min-h-11"
          >
            {isLoading ? <AuthLoader /> : "Зарегистрироваться"}
          </button>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/35 p-3 text-xs leading-5 text-slate-400">
            <input
              id="legal-consent"
              type="checkbox"
              checked={hasAcceptedLegal}
              onChange={(e) => setHasAcceptedLegal(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
            />
            <label htmlFor="legal-consent" className="cursor-pointer">
              Я соглашаюсь с{" "}
              <Link
                to="/terms"
                onClick={handleLegalLink}
                className="font-medium text-slate-300 transition-colors hover:text-indigo-400"
              >
                Условиями использования
              </Link>
              ,{" "}
              <Link
                to="/privacy"
                onClick={handleLegalLink}
                className="font-medium text-slate-300 transition-colors hover:text-indigo-400"
              >
                Политикой конфиденциальности
              </Link>{" "}
              и{" "}
              <Link
                to="/personal-data-consent"
                onClick={handleLegalLink}
                className="font-medium text-slate-300 transition-colors hover:text-indigo-400"
              >
                Согласием на обработку персональных данных
              </Link>
              .
            </label>
          </div>

          <p className="text-xs text-slate-500 text-center dark:text-slate-400">
            Регистрация создаёт аккаунт Glowy и позволяет сохранять задачи,
            прогресс и настройки.
          </p>

          <div className="mt-4 text-center text-sm text-slate-400">
            Уже есть аккаунт?{" "}
            <Link
              to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Войти
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
