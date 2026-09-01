import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";

const OfferPage = () => {
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
              Публичная оферта
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Дата редакции: 29 августа 2026 г.
            </p>
          </div>
        </div>

        <div className="space-y-8 leading-7 text-slate-300">
          <section>
            <p>
              Исторические персональные сведения удалены
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">1. Термины</h2>
            <p className="mt-2">
              1.1. <strong>Сервис</strong> — программный комплекс Glowy, доступный по адресу glowy-ai.ru.<br />
              1.2. <strong>Пользователь</strong> — физическое лицо, осуществившее акцепт оферты.<br />
              1.3. <strong>Акцепт</strong> — полная и безоговорочная регистрация в Сервисе.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">2. Предмет оферты</h2>
            <p className="mt-2">
              2.1. Исполнитель предоставляет Пользователю право использования Сервиса на условиях простой (неисключительной) лицензии для личных некоммерческих целей.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">3. Регистрация и аккаунт</h2>
            <p className="mt-2">
              3.1. Для использования всех функций Сервиса Пользователь обязан пройти процедуру регистрации. Пользователь несет ответственность за сохранность своих учетных данных.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">4. Тарифы</h2>
            <p className="mt-2">
              4.1. В Сервисе предусмотрены следующие тарифные планы:<br />
              - <strong>Start</strong> — базовый бесплатный доступ (10 AI-запросов в день).<br />
              - <strong>Focus</strong> — расширенный доступ (99 ₽/месяц, 70 AI-запросов в день).<br />
              - <strong>Forever</strong> — пожизненный доступ (70 AI-запросов в день); новое оформление временно недоступно.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">5. AI-лимиты</h2>
            <p className="mt-2">
              5.1. Использование функций искусственного интеллекта ограничено суточными лимитами в зависимости от выбранного тарифа. Исполнитель вправе изменять лимиты в одностороннем порядке.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">6. Оплата</h2>
            <p className="mt-2">
              6.1. Оплата тарифа Focus производится через платежных агрегаторов. Доступ к платным функциям предоставляется автоматически после подтверждения факта успешной оплаты.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">7. Подписка и срок доступа</h2>
            <p className="mt-2">
              7.1. Подписка на тариф Focus предоставляется на срок 30 календарных дней. Условия продления и возможность автоматического продления отображаются на странице оплаты и/или в интерфейсе сервиса.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">8. Отмена подписки</h2>
            <p className="mt-2">
              8.1. Пользователь может отменить подписку в любой момент. Доступ к платным функциям сохраняется до конца оплаченного периода.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">9. Ограничения AI</h2>
            <p className="mt-2">
              9.1. Ответы ИИ могут быть неточными. Исполнитель не несет ответственности за решения, принятые Пользователем на основе ответов ИИ.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">10. Ответственность</h2>
            <p className="mt-2">
              10.1. Сервис предоставляется «как есть». Исполнитель не гарантирует бесперебойную работу Сервиса.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">11. Контакты</h2>
            <p className="mt-2">
              Исторические персональные сведения удалены<br />
              Исторические персональные сведения удалены<br />
              Исторические персональные сведения удалены
            </p>
          </section>
        </div>
      </article>
    </main>
  );
};

export default OfferPage;
