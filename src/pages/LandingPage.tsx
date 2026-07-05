import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ListChecks,
  LogIn,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

const demoScenarios = [
  {
    label: "С чего начать?",
    prompt: "Я устал и не понимаю, с чего начать",
    reply:
      "Начни мягко: сначала короткая задача на 10 минут, потом один важный шаг. Я выбрал фокус без перегруза.",
    tasks: [
      {
        title: "Ответить преподавателю",
        meta: "Сегодня · Учеба",
        energy: "Низкая",
        color: "emerald",
      },
      {
        title: "Собрать план проекта",
        meta: "Сегодня · Glowy",
        energy: "Средняя",
        color: "amber",
      },
    ],
  },
  {
    label: "Разобрать мысли",
    prompt: "Надо купить продукты, дописать пост и убрать рабочий стол",
    reply:
      "Я отделил дела от шума и разложил их в список. Можно двигаться по одному пункту, без ощущения завала.",
    tasks: [
      {
        title: "Купить продукты",
        meta: "Сегодня · Быт",
        energy: "Низкая",
        color: "emerald",
      },
      {
        title: "Дописать пост",
        meta: "Завтра · Развитие",
        energy: "Средняя",
        color: "amber",
      },
      {
        title: "Убрать рабочий стол",
        meta: "Сегодня · Быт",
        energy: "Низкая",
        color: "emerald",
      },
    ],
  },
  {
    label: "Спланировать день",
    prompt: "Смотря на мою энергию, распредели день",
    reply:
      "Сначала легкие задачи, затем один важный фокус. Высокоэнергичные дела лучше оставить на момент, когда появится запас сил.",
    tasks: [
      {
        title: "Оплатить интернет",
        meta: "Сегодня · Быт",
        energy: "Низкая",
        color: "emerald",
      },
      {
        title: "Подготовить структуру релиза",
        meta: "Сегодня · Работа",
        energy: "Средняя",
        color: "amber",
      },
    ],
  },
];

const problemCards = [
  "Мысли лежат в заметках, чатах и голове одновременно.",
  "Список задач растет, но не становится понятнее, с чего начать.",
  "Планы не учитывают энергию, поэтому день быстро превращается в перегруз.",
];

const steps = [
  {
    title: "Выгрузи мысли",
    text: "Пиши как есть: дела, тревожные хвосты, идеи, планы и обрывки мыслей.",
  },
  {
    title: "Glowy разберет хаос",
    text: "ИИ отделит разговор от задач, найдет шаги, даты, категории и энергию.",
  },
  {
    title: "Подтверди направление",
    text: "Ты остаешься главным: ассистент предлагает, а ты решаешь, что делать.",
  },
  {
    title: "Двигайся спокойно",
    text: "Задачи, фокус дня, прогресс и энергия собираются в один рабочий ритм.",
  },
];

const featureCards = [
  {
    icon: Brain,
    title: "Хаб мыслей",
    text: "Свободный ввод вместо жесткой формы: можно писать как думается.",
  },
  {
    icon: ListChecks,
    title: "Задачи и подзадачи",
    text: "Списки, чек-листы, категории, приоритеты и понятные даты.",
  },
  {
    icon: Zap,
    title: "Энергия дня",
    text: "Планирование с учетом того, сколько сил есть прямо сейчас.",
  },
  {
    icon: Target,
    title: "Фокус дня",
    text: "Подсказка, с чего начать, чтобы не тратить силы на выбор.",
  },
  {
    icon: CalendarDays,
    title: "Мягкое планирование",
    text: "Сегодня, завтра, без даты и будущие сценарии повторений.",
  },
  {
    icon: ShieldCheck,
    title: "Контроль за пользователем",
    text: "ИИ помогает с черновой работой, но не забирает управление.",
  },
];

const roadmapItems = [
  "Голосовой ввод в Хаб мыслей",
  "Подтверждение AI-действий перед изменениями",
  "Интеграция в Телеграм",
  "Более глубокая аналитика энергии и прогресса",
];

const faqs = [
  {
    question: "Можно ли попробовать Glowy бесплатно?",
    answer:
      "Да. Можно начать бесплатно, создать аккаунт и проверить Хаб мыслей, задачи, фокус дня и базовые лимиты ИИ.",
  },
  {
    question: "Чем Glowy отличается от обычного списка дел?",
    answer:
      "Glowy не просто хранит задачи. Он помогает превратить поток мыслей в структуру, учитывает энергию и подсказывает мягкий следующий шаг.",
  },
  {
    question: "ИИ сам меняет мои задачи?",
    answer:
      "Нет. Главная идея Glowy — ассистент предлагает и помогает, но пользователь сохраняет контроль над планом.",
  },
  {
    question: "Что сохраняется после регистрации?",
    answer:
      "Задачи, подзадачи, прогресс, настройки интерфейса и история работы с приложением сохраняются в аккаунте.",
  },
];

function LandingPage() {
  const [activeDemo, setActiveDemo] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const scenario = demoScenarios[activeDemo];

  return (
    <main className="min-h-screen overflow-hidden bg-[#050816] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050816]/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="Glowy">
            {/* <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200/30 bg-cyan-200/10">
              <Sparkles className="text-cyan-100" size={22} />
            </span> */}
            <span className="text-2xl font-black italic tracking-normal text-white">
              GLOWY<span className="text-indigo-400">.AI</span>
            </span>
          </a>

          <div className="hidden items-center gap-8 text-sm font-bold text-slate-300 lg:flex">
            <a className="transition-colors hover:text-white" href="#how">
              Как работает
            </a>
            <a className="transition-colors hover:text-white" href="#features">
              Возможности
            </a>
            <a className="transition-colors hover:text-white" href="#plans">
              Планы
            </a>
            <a className="transition-colors hover:text-white" href="#faq">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="hidden items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-slate-200 transition-colors hover:border-white/30 hover:bg-white/5 sm:inline-flex"
            >
              <LogIn size={18} />
              Войти
            </Link>
            <Link
              to="/register"
              className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition-colors hover:bg-indigo-500 sm:px-5"
            >
              Регистрация
            </Link>
          </div>
        </nav>
      </header>

      <section id="top" className="mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 sm:pt-28 lg:px-8 lg:pb-32">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-400/10 px-4 py-2 text-sm font-bold text-indigo-100">
            <Sparkles size={17} />
            AI-планер для задач, мыслей и энергии
          </div>

          <h1 className="text-5xl font-black leading-[0.95] tracking-normal text-white sm:text-6xl lg:text-8xl">
            Превращай хаос мыслей в спокойный план дня
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-xl leading-9 text-slate-300">
            Glowy помогает выгрузить дела из головы, разобрать мысли через ИИ,
            оценить энергию и выбрать понятный фокус без перегруза.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-7 py-4 text-base font-black text-white shadow-xl shadow-indigo-600/25 transition-colors hover:bg-indigo-500"
            >
              Попробовать бесплатно
              <ArrowRight size={20} />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 px-7 py-4 text-base font-black text-cyan-100 transition-colors hover:bg-cyan-300/10"
            >
              <PlayCircle size={20} />
              Посмотреть демо
            </a>
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            ["3", "демо-запроса для быстрого старта"],
            ["10+", "AI-запросов в день на Start"],
            ["100", "запросов в день на Focus"],
          ].map(([value, label]) => (
            <div
              key={label}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
            >
              <div className="text-4xl font-black text-white">{value}</div>
              <div className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className="border-y border-white/10 bg-slate-950/35 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-200">
              Живой сценарий
            </p>
            <h2 className="mt-5 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
              Один чат понимает, где поддержать, а где создать задачи
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Нажми на пример и посмотри, как Glowy отвечает, выделяет задачи
              и показывает план в рабочей панели.
            </p>
          </div>

          <div className="mt-14 flex flex-wrap justify-center gap-3">
            {demoScenarios.map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveDemo(index)}
                className={`rounded-full border px-5 py-3 text-sm font-black transition-all ${
                  activeDemo === index
                    ? "border-indigo-300 bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 hover:bg-white/[0.08]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] border border-white/10 bg-[#111a2c] shadow-2xl shadow-black/30">
              <div className="border-b border-white/10 p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-indigo-200" size={32} />
                  <div>
                    <h3 className="text-3xl font-black text-white">
                      Хаб мыслей
                    </h3>
                    <p className="mt-1 text-slate-400">
                      Пиши свободно, без формы и лишних полей.
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-[440px] space-y-7 bg-[#09111f] p-6 sm:p-8">
                <div className="ml-auto max-w-[78%] rounded-[1.5rem] bg-indigo-600 px-6 py-5 text-lg font-bold text-white">
                  {scenario.prompt}
                </div>
                <div
                  key={scenario.reply}
                  className="max-w-[82%] rounded-[1.5rem] border border-slate-600/50 bg-slate-800/85 px-6 py-5 text-lg font-semibold leading-8 text-white"
                >
                  {scenario.reply}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#111a2c] p-6 shadow-2xl shadow-black/30 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-black text-white">
                    Пункт управления
                  </h3>
                  <p className="mt-2 text-slate-400">
                    Задачи появляются в контексте дня и энергии.
                  </p>
                </div>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-sm font-black text-emerald-200">
                  энергия 65%
                </span>
              </div>

              <div className="mt-8 space-y-4">
                {scenario.tasks.map((task) => (
                  <div
                    key={task.title}
                    className="rounded-3xl border border-white/10 bg-slate-950/45 p-5"
                  >
                    <div className="flex gap-4">
                      <span
                        className={`mt-1 h-16 w-1.5 shrink-0 rounded-full ${
                          task.color === "emerald"
                            ? "bg-emerald-400"
                            : "bg-amber-400"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xl font-black text-white">
                          {task.title}
                        </h4>
                        <p className="mt-2 text-sm font-semibold text-slate-400">
                          {task.meta}
                        </p>
                        <span className="mt-3 inline-flex rounded-xl border border-white/15 px-3 py-1 text-sm font-bold text-slate-200">
                          {task.energy} энергия
                        </span>
                      </div>
                      <CheckCircle2 className="text-slate-500" size={24} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
              Список задач не помогает, если непонятно, что делать дальше
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Glowy создан для моментов, когда задач много, мыслей еще больше,
              а ясности мало.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {problemCards.map((text, index) => (
              <div
                key={text}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-lg font-black text-white">
                  {index + 1}
                </span>
                <p className="mt-8 text-xl font-black leading-8 text-white">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="bg-slate-950/35 py-24 text-white lg:py-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-black leading-tight sm:text-5xl">
              От мысли до плана — в одном диалоге
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Не нужно заранее понимать, как правильно оформить задачу. Просто
              напиши, что происходит.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-sm"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-black text-white">
                  {index + 1}
                </span>
                <h3 className="mt-8 text-2xl font-black">{step.title}</h3>
                <p className="mt-4 text-base font-semibold leading-7 text-slate-300">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 lg:py-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
              Не просто хранит задачи — помогает ими управлять
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Внутри Glowy соединяются задачи, AI, энергия, прогресс и дневной
              фокус.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-8"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
                    <Icon size={24} />
                  </span>
                  <h3 className="mt-7 text-2xl font-black text-white">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-base font-semibold leading-7 text-slate-400">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* <section className="bg-slate-950/30 py-24 text-white lg:py-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 shadow-2xl shadow-slate-200/70 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-indigo-600 p-8 text-white sm:p-12">
              <h2 className="text-4xl font-black leading-tight sm:text-5xl">
                ИИ предлагает — ты контролируешь
              </h2>
              <p className="mt-8 text-xl font-semibold leading-9 text-indigo-50">
                Glowy не забирает управление на себя. Он помогает с черновой
                работой: планом, задачами, сроками, приоритетами и следующим
                шагом.
              </p>
            </div>
            <div className="grid gap-4 bg-slate-950/30 p-8 sm:p-12">
              {[
                "Ассистент может создать черновик задач из потока мыслей.",
                "Можно попросить перенести задачу или подобрать фокус.",
                "Подтверждение важных AI-действий появится в следующих версиях.",
              ].map((text) => (
                <div
                  key={text}
                  className="rounded-3xl border border-slate-200 bg-white p-6 text-lg font-bold leading-8 text-slate-700"
                >
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section> */}

      <section id="plans" className="py-24 lg:py-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
              Что появится дальше
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Glowy развивается в сторону личного AI-наставника, который
              помогает планировать бережно и действовать яснее.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {roadmapItems.map((item, index) => (
              <div
                key={item}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-8"
              >
                <span className="text-sm font-black uppercase tracking-[0.25em] text-indigo-200">
                  0{index + 1}
                </span>
                <p className="mt-6 text-2xl font-black leading-8 text-white">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-slate-950/30 py-24 text-slate-950 lg:py-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-slate-900/50 p-8 text-center text-white sm:p-12 lg:p-16">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-200">
              Начни бесплатно
            </p>
            <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">
              Создай первый спокойный план дня уже сегодня
            </h2>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              Бесплатный старт подходит, чтобы проверить задачи, Хаб мыслей и
              фокус дня. Расширенные AI-лимиты доступны в тарифах.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-7 py-4 text-base font-black text-slate-950 transition-colors hover:bg-slate-100"
              >
                Попробовать бесплатно
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-7 py-4 text-base font-black text-white transition-colors hover:bg-white/10"
              >
                Смотреть тарифы
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 lg:py-36">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-indigo-200">
              FAQ
            </p>
            <h2 className="mt-5 text-4xl font-black leading-tight text-white sm:text-5xl">
              Частые вопросы
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <button
                  key={item.question}
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left transition-colors hover:bg-white/[0.07]"
                >
                  <span className="flex items-center justify-between gap-4 text-xl font-black text-white">
                    {item.question}
                    <ChevronDown
                      className={`shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      size={22}
                    />
                  </span>
                  {isOpen && (
                    <span className="mt-5 block text-base font-semibold leading-7 text-slate-400">
                      {item.answer}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-12">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 text-sm font-semibold text-slate-400 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <div className="text-2xl font-black italic text-white">
              GLOWY<span className="text-indigo-400">.AI</span>
            </div>
            <p className="mt-4 leading-7">
              Эмпатичный AI-планер для задач, мыслей, энергии и прогресса.
            </p>
            <p className="mt-4">Версия: v2.0.0</p>
          </div>
          <div className="grid gap-3">
            <Link to="/pricing" className="hover:text-white">
              Тарифы
            </Link>
            <Link to="/contacts" className="hover:text-white">
              Контакты
            </Link>
            <Link to="/requisites" className="hover:text-white">
              Реквизиты
            </Link>
          </div>
          <div className="grid gap-3">
            <Link to="/terms" className="hover:text-white">
              Условия использования
            </Link>
            <Link to="/privacy" className="hover:text-white">
              Политика конфиденциальности
            </Link>
            <Link to="/personal-data-consent" className="hover:text-white">
              Согласие на обработку данных
            </Link>
            <Link to="/refund-policy" className="hover:text-white">
              Условия возврата
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default LandingPage;
