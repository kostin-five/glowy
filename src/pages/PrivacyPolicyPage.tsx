import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

const PrivacyPolicyPage = () => (
  <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="mb-8 inline-flex text-sm text-indigo-300">
        ← На главную
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h1 className="font-display text-3xl font-black">
            Политика конфиденциальности
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Последнее обновление: 31 мая 2026
          </p>
        </div>
      </div>

      <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 leading-7 text-slate-300">
        <section>
          <h2 className="font-display text-xl font-bold text-slate-100">
            Какие данные мы обрабатываем
          </h2>
          <p className="mt-2">
            Glowy хранит данные аккаунта, задачи, подзадачи, категории,
            приоритеты, энергопотенциал и прогресс XP. Эти данные нужны, чтобы
            приложение могло показывать список задач, аналитику и персональные
            подсказки.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-slate-100">
            Как используется ИИ
          </h2>
          <p className="mt-2">
            Когда ты используешь ИИ-функции, текст запроса может быть отправлен
            внешнему AI-провайдеру для анализа и генерации ответа. Не отправляй
            в чат пароли, платежные данные, медицинские документы или другую
            чувствительную информацию.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-slate-100">
            Локальное хранение
          </h2>
          <p className="mt-2">
            Для удобства Glowy может сохранять часть состояния в localStorage:
            авторизацию, демо-режим, список задач и настройки интерфейса. Это
            помогает приложению быстрее открываться и работать устойчивее.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-slate-100">
            Безопасность
          </h2>
          <p className="mt-2">
            Мы стремимся защищать данные разумными техническими мерами. При
            этом ни один способ передачи и хранения информации не является
            абсолютно защищенным, поэтому важно использовать надежный пароль и
            не передавать доступ к аккаунту третьим лицам.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-slate-100">
            Твои права
          </h2>
          <p className="mt-2">
            Ты можешь перестать использовать сервис, выйти из аккаунта и
            удалить локальные данные браузера. Для удаления серверных данных
            потребуется отдельный запрос к команде проекта.
          </p>
        </section>
      </div>
    </div>
  </main>
);

export default PrivacyPolicyPage;
