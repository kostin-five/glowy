import { Component, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  handleRetry = () => {
    this.props.onRetry?.();
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <section
          className="mx-auto flex min-h-[20rem] max-w-xl flex-col items-center justify-center px-6 text-center"
          aria-live="polite"
        >
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Не удалось загрузить этот экран
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Это не повлияло на сохранённые задачи. Попробуй открыть экран ещё раз.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            Попробовать снова
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
