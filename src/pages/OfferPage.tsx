import { useNavigate } from "react-router-dom";

export default function OfferPage() {
  const navigate = useNavigate();
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
    <article className="mx-auto max-w-3xl space-y-6 leading-7">
      <button type="button" onClick={() => navigate(-1)} className="text-indigo-300">← Вернуться</button>
      <h1 className="font-display text-3xl font-bold">Демонстрационная версия Glowy</h1>
      <p>Glowy сохраняется как портфолио-проект. Новые покупки и оформление подписок отключены. Эта страница не является предложением заключить договор или оплатить услугу.</p>
      <p>Платёжная интеграция сохранена в исходниках и тестах как инженерный пример. Её наличие не означает подтверждённую выручку или доступность коммерческого сервиса.</p>
      <p>Для знакомства используй гостевой режим и вымышленные задачи. Не вводи платёжные реквизиты или чувствительные данные.</p>
    </article>
  </main>;
}
