import { Link } from "react-router-dom";

const PaymentCancelPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 p-8 rounded-3xl text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Оплата не завершена</h1>
        <p className="text-slate-400 mb-4">Платёж не был завершён. Если оплата не была подтверждена, деньги не списываются.</p>
        <p className="text-sm text-slate-500 mb-8">Вы можете вернуться к тарифам и попробовать позже.</p>
        
        <div className="flex flex-col gap-3">
          <Link to="/pricing" className="w-full bg-slate-800 text-white py-3 rounded-xl hover:bg-slate-700 transition">Вернуться к тарифам</Link>
          <Link to="/" className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-500 transition">На главную</Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;
