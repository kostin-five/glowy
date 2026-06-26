import { useNavigate } from "react-router-dom";
import { RotateCcw } from "lucide-react";

const RefundPolicyPage = () => {
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
            <RotateCcw size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="break-words font-display text-2xl font-black sm:text-3xl">
              Условия возврата
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Дата редакции: 26 июня 2026 г.
            </p>
          </div>
        </div>

        <div className="space-y-8 leading-7 text-slate-300">
          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">1. Как запросить возврат</h2>
            <p className="mt-2">
              Исторические персональные сведения удалены
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Email аккаунта;</li>
              <li>Дата оплаты;</li>
              <li>Сумма платежа;</li>
              <li>Идентификатор платежа (при наличии);</li>
              <li>Причина возврата.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">2. Срок рассмотрения</h2>
            <p className="mt-2">
              Запросы на возврат рассматриваются в течение 10 рабочих дней.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">3. Ошибочный или повторный платёж</h2>
            <p className="mt-2">
              В случае ошибочного или повторного платежа возврат осуществляется в полном объеме.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">4. Технический сбой</h2>
            <p className="mt-2">
              Если доступ к Сервису не был предоставлен по техническим причинам на стороне Исполнителя, Пользователь имеет право на полный возврат за неоказанный период.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">5. Неиспользованный период</h2>
            <p className="mt-2">
              При отмене подписки возврат за неиспользованный остаток оплаченного периода не производится, доступ сохраняется до конца срока.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">6. Уже использованный период</h2>
            <p className="mt-2">
              Возврат за уже использованный период подписки не производится, так как услуга считается оказанной в момент предоставления доступа.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">7. Способ возврата</h2>
            <p className="mt-2">
              Возврат денежных средств осуществляется тем же способом, которым была произведена оплата.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">8. Контакты для возврата</h2>
            <p className="mt-2">
              Исторические персональные сведения удалены
            </p>
          </section>
        </div>
      </article>
    </main>
  );
};

export default RefundPolicyPage;
