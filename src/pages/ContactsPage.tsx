import { useNavigate } from "react-router-dom";

export default function ContactsPage() {
  const navigate = useNavigate();
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
    <article className="mx-auto max-w-3xl space-y-6 leading-7">
      <button type="button" onClick={() => navigate(-1)} className="text-indigo-300">← Вернуться</button>
      <h1 className="font-display text-3xl font-bold">Связь по проекту</h1>
      <p>Вопросы об исходниках и ошибки интерфейса можно обсудить в GitHub Issues. Не публикуй там credentials, личные данные или содержимое задач.</p>
      <a className="text-indigo-300" href="https://github.com/kostin-five/glowy/issues">GitHub Issues</a>
    </article>
  </main>;
}
