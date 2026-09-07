import { useLayoutEffect } from "react";
import type { FoundationTheme } from "./tokens";

const FoundationShowcase = () => {
  const theme: FoundationTheme = new URLSearchParams(window.location.search).get("theme") === "light"
    ? "light"
    : "dark";

  useLayoutEffect(() => {
    const shouldUseDark = theme === "dark";
    document.documentElement.classList.toggle("dark", shouldUseDark);
    document.body.classList.toggle("dark", shouldUseDark);
    document.title = "Glowy · Design foundations";
  }, [theme]);

  return (
    <main className="foundation-showcase min-h-dvh bg-glowy-canvas px-4 py-8 font-glowy-sans text-glowy-text-primary sm:px-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="rounded-glowy-panel border border-glowy-border-subtle bg-glowy-surface p-6 shadow-glowy-panel sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-glowy-text-muted">
            Glowy foundations
          </p>
          <h1 className="mt-3 font-glowy-display text-2xl font-bold sm:text-3xl">
            Спокойная основа интерфейса
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-glowy-text-secondary">
            Техническая showcase для проверки semantic tokens. В пользовательскую навигацию она не входит.
          </p>
        </header>

        <section aria-labelledby="foundation-surfaces" className="grid gap-4 md:grid-cols-2">
          <article className="rounded-glowy-panel border border-glowy-border-subtle bg-glowy-surface p-6 shadow-glowy-panel">
            <h2 id="foundation-surfaces" className="font-glowy-display text-lg font-bold">
              Поверхности и текст
            </h2>
            <p className="mt-3 text-glowy-text-secondary">
              Вторичный текст помогает удерживать внимание на следующем шаге без лишнего контраста.
            </p>
            <p className="mt-2 text-sm text-glowy-text-muted">
              Спокойная подпись остаётся читаемой в обеих темах.
            </p>
          </article>
          <article className="rounded-glowy-panel border border-glowy-border-strong bg-glowy-surface-raised p-6 shadow-glowy-glow">
            <h2 className="font-glowy-display text-lg font-bold">Фирменный акцент</h2>
            <p className="mt-3 text-glowy-text-secondary">
              Один ясный акцент поддерживает действие, не превращая экран в шумный dashboard.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="foundation-token-focus min-h-glowy-touch-target rounded-glowy-control bg-glowy-primary px-4 py-2 text-sm font-bold text-glowy-primary-foreground transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-glowy-glow"
              >
                Спокойное действие
              </button>
              <button
                type="button"
                className="foundation-token-focus min-h-glowy-touch-target rounded-glowy-control border border-glowy-border-strong bg-transparent px-4 py-2 text-sm font-bold text-glowy-text-primary"
              >
                Проверить фокус
              </button>
            </div>
          </article>
        </section>

        <section aria-labelledby="foundation-status" className="rounded-glowy-panel border border-glowy-border-subtle bg-glowy-surface p-6 shadow-glowy-panel">
          <h2 id="foundation-status" className="font-glowy-display text-lg font-bold">
            Состояния без тревоги
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <p className="rounded-glowy-control bg-glowy-status-success px-4 py-3 text-sm font-bold text-glowy-status-success-foreground">
              Всё синхронизировано
            </p>
            <p className="rounded-glowy-control bg-glowy-status-warning px-4 py-3 text-sm font-bold text-glowy-status-warning-foreground">
              Нужна пауза
            </p>
            <p className="rounded-glowy-control bg-glowy-status-danger px-4 py-3 text-sm font-bold text-glowy-status-danger-foreground">
              Нужна проверка
            </p>
          </div>
        </section>

        <section aria-labelledby="foundation-motion" className="rounded-glowy-panel border border-glowy-border-subtle bg-glowy-surface p-6 shadow-glowy-panel">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <h2 id="foundation-motion" className="font-glowy-display text-lg font-bold">
                Движение и касание
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-glowy-text-secondary">
                Орбита отключается при reduced motion, а интерактивные цели не меньше 44 пикселей.
              </p>
            </div>
            <div
              aria-label="Декоративная орбита"
              className="relative flex h-glowy-touch-target w-glowy-touch-target items-center justify-center rounded-glowy-pill border border-glowy-border-strong bg-glowy-surface-raised"
            >
              <span className="h-2 w-2 rounded-glowy-pill bg-glowy-accent" />
              <span
                data-testid="foundation-orbit"
                className="foundation-token-orbit absolute inset-1 rounded-glowy-pill border border-glowy-accent"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default FoundationShowcase;
