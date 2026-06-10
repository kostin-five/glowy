import { useState } from "react";
import { AuthApi } from "../api/AuthApi";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import AuthLoader from "../components/ui/AuthLoader";

const RegisterPage = () => {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      return setError("Пароли не совпадают!");
    }

    setIsLoading(true);

    try {
      await AuthApi.registerRequest({ name, email, password });
      navigate("/login");
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const serverError =
          e.response?.data?.error ||
          e.response?.data?.message ||
          "Сервер недоступен (проверь терминал бэкенда)";

        setError(serverError);
        console.error("Детали ошибки:", e.response?.data);
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
            <label className="block text-slate-300 text-sm font-medium mb-2 pl-1">
              Ваше имя
            </label>
            <input
              type="text"
              placeholder="Напишите имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 px-3 py-2 sm:px-4 sm:py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2 pl-1">
              Почта
            </label>
            <input
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
            <label className="block text-slate-300 text-sm font-medium mb-2 pl-1">
              Пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <label className="block text-slate-300 text-sm font-medium mb-2 pl-1">
              Подтвердите пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            disabled={isLoading}
            className="w-full mt-2 bg-linear-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center min-h-11"
          >
            {isLoading ? <AuthLoader /> : "Зарегистрироваться"}
          </button>

          <p className="text-xs text-slate-500 mt-4 text-center dark:text-slate-400">
            Нажимая кнопку «Зарегистрироваться», вы соглашаетесь с{" "}
            <Link
              to="/privacy"
              className="hover:text-indigo-400 transition-colors"
            >
              Политикой конфиденциальности
            </Link>{" "}
            и{" "}
            <Link
              to="/terms"
              className="hover:text-indigo-400 transition-colors"
            >
              Условиями использования
            </Link>
            .
          </p>

          <div className="mt-4 text-center text-sm text-slate-400">
            Уже есть аккаунт?{" "}
            <Link
              to="/login"
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
