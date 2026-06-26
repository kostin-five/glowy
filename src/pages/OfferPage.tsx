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
              Дата редакции: {'{{EFFECTIVE_DATE}}'}
            </p>
          </div>
        </div>

        <div className="space-y-8 leading-7 text-slate-300">
          <section>
            <p>
              Настоящий документ является публичной офертой {'{{LEGAL_NAME}}'} (далее — «Исполнитель») и содержит все существенные условия предоставления доступа к сервису Glowy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">1. Термины</h2>
            <ul className="mt-2 list-inside list-disc space-y-2">
              <li><strong>Сервис</strong> — программный комплекс Glowy, доступный по адресу glowy-ai.ru.</li>
              <li><strong>Пользователь</strong> — физическое лицо, осуществившее акцепт оферты.</li>
              <li><strong>Акцепт</strong> — полная и безоговорочная регистрация в Сервисе.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">2. Предмет оферты</h2>
            <p className="mt-2">
              Исполнитель предоставляет Пользователю право использования Сервиса на условиях простой (неисключительной) лицензии для личных некоммерческих целей.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">3. Регистрация и аккаунт</h2>
            <p className="mt-2">
              Для использования всех функций Сервиса Пользователь обязан пройти процедуру регистрации. Пользователь несет ответственность за сохранность своих учетных данных.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">4. Тарифы</h2>
            <p className="mt-2">
              В Сервисе предусмотрены следующие тарифные планы:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-2">
              <li><strong>Start</strong> — базовый бесплатный доступ с ограничениями.</li>
              <li><strong>Focus</strong> — расширенный доступ с ежемесячной оплатой.</li>
              <li><strong>Forever</strong> — бессрочный доступ с разовой оплатой.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">5. AI-лимиты</h2>
            <p className="mt-2">
              Использование функций искусственного интеллекта ограничено суточными или месячными лимитами в зависимости от выбранного тарифа. Исполнитель вправе изменять лимиты в одностороннем порядке.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">6. Оплата</h2>
            <p className="mt-2">
              Оплата производится через платежных агрегаторов. Доступ к платным функциям предоставляется после подтверждения факта оплаты.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">7. Подписка и срок доступа</h2>
            <p className="mt-2">
              Подписка продлевается автоматически, если Пользователь не отключил автопродление в настройках аккаунта.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">8. Отмена подписки</h2>
            <p className="mt-2">
              Пользователь может отменить подписку в любой момент. Доступ к платным функциям сохраняется до конца оплаченного периода.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">9. Ограничения AI</h2>
            <p className="mt-2">
              Ответы ИИ могут быть неточными. Исполнитель не несет ответственности за решения, принятые Пользователем на основе ответов ИИ.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">10. Ответственность</h2>
            <p className="mt-2">
              Сервис предоставляется «как есть». Исполнитель не гарантирует бесперебойную работу Сервиса.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">11. Контакты</h2>
            <p className="mt-2">
              {'{{LEGAL_NAME}}'}<br />
              ИНН: {'{{INN}}'}<br />
              Email: {'{{LEGAL_EMAIL}}'}
            </p>
          </section>
        </div>
      </article>
    </main>
  );
};

export default OfferPage;
