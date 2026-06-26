import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

const PrivacyPolicyPage = () => {
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
            <ShieldCheck size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="break-words font-display text-2xl font-black sm:text-3xl">
              Политика конфиденциальности
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
            <p className="mt-3">
              Мы не продаём персональные данные пользователей.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Какие данные мы обрабатываем
            </h2>
            <p className="mt-2">
              Glowy может обрабатывать имя, адрес электронной почты, хэш
              пароля, данные аккаунта, задачи, подзадачи, категории,
              приоритеты, энергозатратность, энергопотенциал, XP, уровень
              прогресса и лимиты AI-запросов. Пароль хранится не в открытом
              виде, а в виде технического хэша.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Для чего нужны данные
            </h2>
            <p className="mt-2">
              Эти данные нужны для регистрации и входа, сохранения задач,
              отображения прогресса, работы Хаба мыслей, аналитики внутри
              аккаунта, защиты от злоупотреблений, поддержки пользователей и
              развития продукта.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Авторизация и cookie
            </h2>
            <p className="mt-2">
              Для входа Glowy использует HttpOnly cookie с именем glowy_token.
              Она передается по защищенному соединению, имеет флаги secure и
              sameSite none и действует 24 часа. Эта cookie нужна только для
              технической авторизации и не относится к аналитическим cookies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              LocalStorage
            </h2>
            <p className="mt-2">
              В браузере могут храниться настройки интерфейса, демо-режим, кеш
              задач, счетчики демо-запросов и выбор по аналитическим cookies.
              Эти данные остаются в браузере до очистки данных сайта или
              локального кеша.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Как используется ИИ
            </h2>
            <p className="mt-2">
              Когда ты используешь AI Hub или AI-анализ, текст запроса может
              проходить по маршруту: backend Glowy в РФ → AI-proxy Glowy в
              Amsterdam → внешний AI-провайдер. Текущий основной AI-провайдер:
              DeepSeek. Это может включать трансграничную передачу данных.
              Основная база данных и production-backend расположены на
              инфраструктуре Timeweb в РФ.
            </p>
            <p className="mt-3">
              Не отправляй в AI Hub пароли, платежные данные, медицинские
              документы, документы личности и другую чувствительную информацию.
              Ответы ИИ могут быть неточными.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Аналитика
            </h2>
            <p className="mt-2">
              Яндекс.Метрика используется только после согласия на
              аналитические cookies. Если отказаться от аналитики, обязательные
              технические cookies авторизации продолжают работать, а Метрика не
              подключается.
            </p>
            <p className="mt-3">
              При отказе от аналитических cookies Яндекс.Метрика не
              подключается.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Сроки хранения
            </h2>
            <p className="mt-2">
              Данные аккаунта, задачи и прогресс хранятся до удаления аккаунта,
              удаления данных или запроса пользователя, если иное не требуется
              законом. JWT-cookie действует 24 часа. Данные в localStorage
              хранятся до очистки браузера или локального кеша приложения.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Твои права
            </h2>
            <p className="mt-2">
              Исторические персональные сведения удалены
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-slate-100">
              Важное уточнение
            </h2>
            <p className="mt-2">
              Glowy находится в активной разработке, поэтому политика может
              обновляться по мере развития продукта и инфраструктуры. Мы не
              даем юридических гарантий этим текстом; он описывает текущий
              подход сервиса к данным простым языком.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
};

export default PrivacyPolicyPage;
