import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";

const ContactsPage = () => {
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
            <Mail size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="break-words font-display text-2xl font-black sm:text-3xl">
              Контакты и реквизиты
            </h1>
          </div>
        </div>

        <div className="space-y-8 leading-7 text-slate-300">
          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">Проект Glowy</h2>
            <p className="mt-2">
              Интеллектуальный таск-трекер для бережного планирования.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">Реквизиты</h2>
            <p className="mt-2">
              Исторические персональные сведения удалены<br />
              Статус: самозанятый<br />
              Исторические персональные сведения удалены
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">Электронная почта</h2>
            <div className="mt-2 space-y-2">
              <p><strong>Поддержка и юридические вопросы:</strong> contact@example.test</p>
              <p><strong>Вопросы оплаты и возвратов:</strong> contact@example.test</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">Домен</h2>
            <p className="mt-2">
              <a href="https://glowy-ai.ru" className="text-indigo-300 hover:underline">glowy-ai.ru</a>
            </p>
          </section>
        </div>
      </article>
    </main>
  );
};

export default ContactsPage;
