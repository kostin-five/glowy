import { useNavigate } from "react-router-dom";

export default function RequisitesPage() {
  const navigate = useNavigate();
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
    <article className="mx-auto max-w-3xl space-y-6 leading-7">
      <button type="button" onClick={() => navigate(-1)} className="text-indigo-300">← Вернуться</button>
      <h1 className="font-display text-3xl font-bold">Портфолио-проект</h1>
      <p>Glowy больше не предлагает новые коммерческие подписки. Личные платёжные реквизиты исключены из публичной демонстрационной версии.</p>
      <a className="text-indigo-300" href="https://github.com/kostin-five/glowy/issues">GitHub Issues</a>
    </article>
  </main>;
}
