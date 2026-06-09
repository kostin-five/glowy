import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";

const TermsOfServicePage = () => {
  const navigate = useNavigate();

  return (
  <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 sm:py-10">
    <article className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-8 inline-flex cursor-pointer text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200"
      >
        ← Вернуться
      </button>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
          <FileText size={24} />
        </div>
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-black sm:text-3xl">
            Условия использования
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Последнее обновление: 31 мая 2026
          </p>
        </div>
      </div>

      <div className="space-y-8 leading-7 text-slate-300">
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
    </article>
  </main>
  );
};

export default TermsOfServicePage;
