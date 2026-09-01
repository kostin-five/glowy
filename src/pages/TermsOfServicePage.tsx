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
              Дата редакции: 29 августа 2026 г.
            </p>
          </div>
        </div>

        <div className="space-y-8 leading-7 text-slate-300">
          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Назначение сервиса
            </h2>
            <p className="mt-2">
              Glowy — это AI task tracker для планирования задач, выгрузки
              мыслей, отслеживания энергопотенциала, XP, прогресса и аналитики.
              Сервис помогает бережно организовать день, но не принимает
              решения вместо пользователя.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Аккаунт и безопасность доступа
            </h2>
            <p className="mt-2">
              Исторические персональные сведения удалены
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Демо-режим и тарифы
            </h2>
            <p className="mt-2">
              Glowy предлагает несколько вариантов использования:<br />
              - <strong>Гость</strong>: 3 AI-запроса в день без регистрации.<br />
              - <strong>Start</strong>: бесплатно после регистрации, 10 AI-запросов в день.<br />
              - <strong>Focus</strong>: платная подписка (99 ₽/месяц), 70 AI-запросов в день.<br />
              - <strong>Forever</strong>: пожизненный доступ (70 AI-запросов в день); новое оформление временно недоступно.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              AI-функции и ограничения
            </h2>
            <p className="mt-2">
              Исторические персональные сведения удалены
            </p>
            <p className="mt-3">
              Glowy и AI-ответы не заменяют профессиональную медицинскую,
              психологическую, юридическую или финансовую консультацию.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Недопустимое использование
            </h2>
            <p className="mt-2">
              Нельзя использовать сервис для незаконных действий, спама,
              попыток взлома, обхода лимитов, распространения вредоносного
              контента, вмешательства в работу сервиса или действий, которые
              мешают другим пользователям.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Ответственность
            </h2>
            <p className="mt-2">
              Glowy предоставляется как инструмент самоорганизации. Сервис
              находится в активной разработке, поэтому отдельные функции могут
              меняться, временно работать нестабильно или иметь ограничения.
              Мы стараемся поддерживать сервис доступным, но не можем
              гарантировать отсутствие ошибок или перерывов.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Оплата и подписки
            </h2>
            <p className="mt-2">
              Оплата тарифа Focus производится через защищенные платежные шлюзы. 
              Условия продления и возможность автоматического продления отображаются на странице оплаты и/или в интерфейсе сервиса. Условия оплаты, предоставления 
              доступа и возвратов регулируются Публичной офертой и Условиями возврата.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Изменения условий и поддержка
            </h2>
            <p className="mt-2">
              Исторические персональные сведения удалены
            </p>
          </section>
        </div>
      </article>
    </main>
  );
};

export default TermsOfServicePage;
