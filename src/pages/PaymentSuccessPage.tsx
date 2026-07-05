import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PaymentApi } from "../api/PaymentApi";
import AuthLoader from "../components/ui/AuthLoader";

const PaymentSuccessPage = () => {
  const [status, setStatus] = useState<"loading" | "active" | "pending" | "error">("loading");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    PaymentApi.getCurrentPlan()
      .then((data) => {
        if (data.plan === "focus" && data.subscriptionStatus === "active" && data.planExpiresAt && new Date(data.planExpiresAt) > new Date()) {
          setStatus("active");
          setExpiresAt(new Date(data.planExpiresAt).toLocaleDateString("ru-RU"));
        } else if (data.plan === "forever" && data.subscriptionStatus === "active") {
          setStatus("active");
          setExpiresAt(null);
        } else {
          setStatus("pending");
        }
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 p-8 rounded-3xl text-center">
        {status === "loading" && <AuthLoader />}
        
        {status === "active" && (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">Тариф активен</h1>
            <p className="text-slate-400 mb-6">Оплата прошла, ваш тариф активирован.</p>
            {expiresAt && <p className="text-sm text-slate-500 mb-8">Действует до: {expiresAt}</p>}
          </>
        )}

        {status === "pending" && (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">Платёж обрабатывается</h1>
            <p className="text-slate-400 mb-4">Мы проверяем оплату. Обычно тариф активируется в течение нескольких секунд.</p>
            <p className="text-sm text-slate-500 mb-8">Если тариф ещё не обновился, вернитесь к тарифам или обновите страницу чуть позже.</p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">Платёж подтверждается</h1>
            <p className="text-slate-400 mb-8">Не удалось проверить тариф автоматически. Если платёж прошёл, тариф обновится после подтверждения.</p>
          </>
        )}

        <div className="flex flex-col gap-3">
          <Link to="/pricing" className="w-full bg-slate-800 text-white py-3 rounded-xl hover:bg-slate-700 transition">Вернуться к тарифам</Link>
          <Link to="/dashboard" className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-500 transition">В пункт управления</Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
