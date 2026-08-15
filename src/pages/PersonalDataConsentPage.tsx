import { useNavigate } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";

const PersonalDataConsentPage = () => {
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
            <ClipboardCheck size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="break-words font-display text-2xl font-black sm:text-3xl">
              Согласие на обработку персональных данных
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Дата редакции: 26 июня 2026 г.
            </p>
          </div>
        </div>

        <div className="space-y-8 leading-7 text-slate-300">
          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Оператор и контакт
            </h2>
            <p className="mt-2">
              Исторические персональные сведения удалены
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Кто дает согласие и кому
            </h2>
            <p className="mt-2">
              Это согласие дает пользователь Glowy, который регистрируется или
              использует сервис. Согласие дается проекту и команде Glowy для
              обработки данных, необходимых для работы приложения.
            </p>
            <p className="mt-3">
              Нажимая чекбокс при регистрации, пользователь подтверждает, что
              ознакомился с Политикой конфиденциальности, Условиями
              использования и настоящим Согласием.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Цели обработки
            </h2>
            <p className="mt-2">
              Данные обрабатываются для регистрации, авторизации, работы задач
              и подзадач, отображения прогресса и XP, работы AI-функций,
              поддержки пользователей, защиты сервиса, учета лимитов и
              аналитики продукта после отдельного согласия на аналитические
              cookies.
            </p>
            <p className="mt-3">
              Согласие на аналитические cookies даётся отдельно через
              cookie-баннер. При отказе от аналитики Яндекс.Метрика не
              подключается.
            </p>
            <p className="mt-3">
              После отдельного согласия используются только обезличенные
              продуктовые события. Тексты задач и AI-сообщений, email, пароли,
              токены и платёжные идентификаторы в Метрику не передаются.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Какие данные могут обрабатываться
            </h2>
            <p className="mt-2">
              Имя, email, хэш пароля, данные аккаунта, задачи, подзадачи,
              категории, приоритеты, энергопотенциал, XP, уровень, AI-запросы,
              AI-лимиты, технические данные запросов, cookie и данные
              localStorage.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Какие действия выполняются с данными
            </h2>
            <p className="mt-2">
              Сбор, запись, систематизация, накопление, хранение, уточнение,
              использование, передача, обезличивание, блокирование, удаление и
              уничтожение в пределах, необходимых для работы сервиса.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Хранение и AI-обработка
            </h2>
            <p className="mt-2">
              Основная production-инфраструктура и база данных Glowy размещены
              на Timeweb в РФ. AI-запросы могут передаваться внешним
              AI-провайдерам для генерации ответа. Основной провайдер —
              DeepSeek; при его временной недоступности используется GigaChat. Это может
              включать трансграничную передачу данных.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Чувствительная информация
            </h2>
            <p className="mt-2">
              Не отправляй в AI Hub пароли, платежные данные, медицинские
              документы, документы личности и другую чувствительную информацию.
              Glowy предназначен для продуктивности и самоорганизации, а не для
              хранения таких данных.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Срок действия и отзыв согласия
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

export default PersonalDataConsentPage;
