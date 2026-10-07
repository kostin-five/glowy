import { useNavigate } from "react-router-dom";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
    <article className="mx-auto max-w-3xl space-y-6 leading-7">
      <button type="button" onClick={() => navigate(-1)} className="text-indigo-300">← Вернуться</button>
      <h1 className="font-display text-3xl font-bold">Данные в демонстрационной версии</h1>
      <p>Редакция от 5 октября 2026 г. Glowy — портфолио-проект. Для знакомства рекомендуем гостевой режим и вымышленные данные. Новая демонстрационная база не является восстановлением старых аккаунтов.</p>
      <section><h2 className="text-xl font-bold">Гостевой режим</h2><p>Настройки и демонстрационные задачи могут сохраняться в браузере, включая IndexedDB и localStorage. Очистка данных сайта удаляет локальное состояние. Не используй демо для хранения важных задач.</p></section>
      <section><h2 className="text-xl font-bold">Если включён сервер</h2><p>Регистрация и вход передают имя, email и пароль на backend. Пароль хранится как хеш; сессия использует HttpOnly cookie. Задачи и настройки аккаунта сохраняются в серверной базе. Эти функции могут быть недоступны, пока новое размещение не проверено.</p></section>
      <section><h2 className="text-xl font-bold">AI и Telegram</h2><p>При явном запуске живой AI-функции запрос и связанный контекст передаются внешнему AI-провайдеру. Telegram-интеграция обрабатывает подписанные данные запуска и привязку аккаунта. В гостевом режиме нет платных AI-вызовов. Не передавай пароли, документы, медицинские сведения или данные других людей.</p></section>
      <section><h2 className="text-xl font-bold">Ограничения</h2><p>Коммерческие покупки отключены. Гарантия сохранности данных и постоянной доступности для демо не предоставляется. Настройки аналитики и согласия сохраняются отдельно; при новом размещении аналитика по умолчанию не настраивается.</p></section>
      <p>Вопросы об исходниках: <a href="https://github.com/kostin-five/glowy/issues" className="text-indigo-300">GitHub Issues</a>. Не публикуй там пароли, токены, email или личные задачи. Эта страница описывает demo-режим и не заменяет юридическую подготовку перед возобновлением сбора реальных персональных данных.</p>
    </article>
  </main>;
}
