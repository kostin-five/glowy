import { useNavigate } from "react-router-dom";

export default function PersonalDataConsentPage() {
  const navigate = useNavigate();
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
    <article className="mx-auto max-w-3xl space-y-6 leading-7">
      <button type="button" onClick={() => navigate(-1)} className="text-indigo-300">← Вернуться</button>
      <h1 className="font-display text-3xl font-bold">Демонстрационные данные</h1>
      <p>Для знакомства используй гостевой режим и вымышленные данные. Ввод настоящих персональных данных не требуется для демонстрации. Регистрация и интеграции, если они включены, передают данные серверу и провайдерам: сначала ознакомься со страницей о данных. Возобновление работы с реальными пользователями требует отдельной юридической подготовки.</p>
      <a className="text-indigo-300" href="https://github.com/kostin-five/glowy/issues">GitHub Issues</a>
    </article>
  </main>;
}
