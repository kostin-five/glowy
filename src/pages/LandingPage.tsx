import { motion } from "framer-motion";
import { useIsAuthenticated, useLogin } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const LandingPage = () => {
  const login = useLogin();
  const isAuthenticated = useIsAuthenticated();
  const [name, setName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      login(name);
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden px-4">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 max-w-lg w-full flex flex-col items-center text-center"
      >
        <div className="w-20 h-20 bg-indigo-500/10  rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
          <span className="text-4xl">
            <img src="Glowy.png" alt="" />
          </span>
        </div>

        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight mb-4">
          Это{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400">
            Glowy
          </span>
        </h1>
        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
          Твой личный компас в мире задач. Управляй энергией, достигай целей и
          отслеживай свой прогресс на лестнице успеха.
        </p>

        <form
          onSubmit={handleLogin}
          className="w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl flex flex-col gap-4 shadow-2xl"
        >
          <h2 className="text-slate-200 font-bold text-left mb-2">
            Начать путь
          </h2>
          <input
            type="text"
            placeholder="Как к тебе обращаться?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            required
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
          >
            Войти в систему
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default LandingPage;
