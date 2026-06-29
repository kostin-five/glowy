import { Link, useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import type { ReactNode } from "react";

const RequisitesPage = () => {
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
              Реквизиты
            </h1>
          </div>
        </div>

        <div className="space-y-8 leading-7 text-slate-300">
          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              О проекте
            </h2>
            <p className="mt-2">
              Glowy AI — SaaS/AI-сервис для планирования задач, мыслей,
              энергопотенциала и прогресса. Онлайн-оплата тарифа Focus
              подключается через платёжного провайдера.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Основные сведения
            </h2>
            <p className="mt-2">
              Проект: Glowy AI<br />
              Сайт:{" "}
              <a
                href="https://glowy-ai.ru"
                className="text-indigo-300 hover:underline"
              >
                https://glowy-ai.ru
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Исполнитель
            </h2>
            <p className="mt-2">
              Исторические персональные сведения удалены<br />
              Статус: самозанятый<br />
              Исторические персональные сведения удалены
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Электронная почта
            </h2>
            <div className="mt-2 space-y-2">
              <p>
                <strong>Email для поддержки:</strong> contact@example.test
              </p>
              <p>
                <strong>Email для юридических вопросов:</strong>Исторические персональные сведения удалены
              </p>
              <p>
                <strong>Email для вопросов оплаты и возвратов:</strong>Исторические персональные сведения удалены
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Документы
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DocumentLink to="/offer">Публичная оферта</DocumentLink>
              <DocumentLink to="/refund-policy">Условия возврата</DocumentLink>
              <DocumentLink to="/privacy">Политика конфиденциальности</DocumentLink>
              <DocumentLink to="/terms">Условия использования</DocumentLink>
              <DocumentLink to="/personal-data-consent">
                Согласие на обработку данных
              </DocumentLink>
              <DocumentLink to="/contacts">Контакты</DocumentLink>
            </div>
          </section>
        </div>
      </article>
    </main>
  );
};

const DocumentLink = ({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) => (
  <Link
    to={to}
    className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-indigo-400 hover:text-white"
  >
    {children}
  </Link>
);

export default RequisitesPage;
