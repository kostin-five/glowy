import { Link, useNavigate } from "react-router-dom";
import { AuthApi } from "../api/AuthApi";
import { useState } from "react";
import { motion } from "framer-motion";
import { useToLogin } from "../store/useAuthStore";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import AuthLoader from "../components/ui/AuthLoader";

const LoginPage = () => {
  const [login, setLogin] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const toLogin = useToLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [showWakeupToast, setShowWakeupToast] = useState(false);

  const toLoginUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setShowWakeupToast(false);

    const wakeupToastTimer = window.setTimeout(() => {
      setShowWakeupToast(true);
    }, 5000);

    try {
      const data = await AuthApi.loginRequest({ login, password });
      toLogin(data.name, login, data.token);
      navigate("/dashboard");
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.error || "Неверный логин или пароль");
      } else {
        setError("Что-то пошло не так");
      }
    } finally {
      window.clearTimeout(wakeupToastTimer);
      setIsLoading(false);
      setShowWakeupToast(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden py-12 px-4">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 max-w-md w-full flex flex-col items-center"
      >
        <div className="w-20 h-16  rounded-3xl flex items-center justify-center mb-6 ">
          <img src="/Glowy.png" alt="Glowy Logo" className="w-22 h-20" />
        </div>

        <h1 className="font-display text-3xl md:text-4xl font-black text-white tracking-tight mb-2 text-center">
          С возвращением в{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-cyan-400">
            Glowy
          </span>
        </h1>
        <p className="text-slate-400 text-sm mb-8 text-center px-4">
          Твой эмпатичный ИИ-наставник по продуктивности. Введи свои данные для
          продолжения.
        </p>
        <form
          onSubmit={toLoginUser}
          className="w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-5 sm:p-8 rounded-3xl flex flex-col gap-4 sm:gap-5 shadow-2xl"
        >
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2 pl-1">
              Логин
            </label>
            <input
              type="text"
              placeholder="Юзернейм"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2 pl-1">
              Пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
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
            disabled={isLoading}
            className="w-full mt-2 bg-linear-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center min-h-13"
          >
            {isLoading ? <AuthLoader /> : "Войти в систему"}
          </button>

          <div className="mt-4 text-center text-sm text-slate-400">
            Нет аккаунта?{" "}
            <Link
              to="/register"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Зарегистрироваться
            </Link>
          </div>
        </form>
      </motion.div>

      {showWakeupToast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-indigo-400/30 bg-slate-900/95 px-4 py-3 text-center text-sm font-medium text-slate-100 shadow-[0_0_30px_rgba(79,70,229,0.25)] backdrop-blur-xl"
        >
          Сервер просыпается 😴 Это может занять до 60 секунд...
        </div>
      )}
    </div>
  );
};

export default LoginPage;
