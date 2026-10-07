import { useNavigate } from "react-router-dom";

export default function RefundPolicyPage() {
  const navigate = useNavigate();
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
    <article className="mx-auto max-w-3xl space-y-6 leading-7">
      <button type="button" onClick={() => navigate(-1)} className="text-indigo-300">← Вернуться</button>
      <h1 className="font-display text-3xl font-bold">Оплаты в demo-версии</h1>
      <p>Новые покупки отключены. Страница не предлагает оплатить сервис; платёжный контур сохранён только в исходниках и тестах. Если ранее совершалась оплата, не публикуй платёжные документы в GitHub Issues.</p>
      <a className="text-indigo-300" href="https://github.com/kostin-five/glowy/issues">GitHub Issues</a>
    </article>
  </main>;
}
