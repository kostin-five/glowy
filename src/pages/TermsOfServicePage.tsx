import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

const TermsOfServicePage = () => (
  <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="mb-8 inline-flex text-sm text-indigo-300">
        ← На главную
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
          <FileText size={24} />
        </div>
        <div>
          <h1 className="font-display text-3xl font-black">
            Условия использования
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Последнее обновление: 31 мая 2026
          </p>
        </div>
      </div>

      <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 leading-7 text-slate-300">
        <section>
          <h2 className="font-display text-xl font-bold text-slate-100">
            Назначение сервиса
          </h2>
          <p className="mt-2">
            Glowy помогает планировать задачи, отслеживать энергопотенциал и
            получать поддерживающие AI-подсказки. Сервис не заменяет
            профессиональную медицинскую, психологическую, юридическую или
            финансовую консультацию.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-slate-100">
            Аккаунт и доступ
          </h2>
          <p className="mt-2">
            Пользователь отвечает за корректность данных аккаунта и сохранность
            доступа. Демо-режим предназначен для знакомства с интерфейсом и
            работает локально без настоящей серверной авторизации.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-slate-100">
            AI-функции
          </h2>
          <p className="mt-2">
            Ответы ИИ могут быть неточными или неполными. Используй их как
            мягкую подсказку для самоорганизации, а важные решения проверяй
            самостоятельно.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-slate-100">
            Допустимое использование
          </h2>
          <p className="mt-2">
            Нельзя использовать сервис для нарушения закона, попыток взлома,
            распространения вредоносного контента, спама или действий, которые
            мешают работе приложения и другим пользователям.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-slate-100">
            Изменения условий
          </h2>
          <p className="mt-2">
            Мы можем обновлять условия по мере развития продукта. Продолжая
            использовать Glowy после изменений, пользователь соглашается с
            актуальной версией условий.
          </p>
        </section>
      </div>
    </div>
  </main>
);

export default TermsOfServicePage;
