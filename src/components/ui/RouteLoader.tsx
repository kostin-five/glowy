interface RouteLoaderProps {
  className?: string;
}

const RouteLoader = ({ className = "" }: RouteLoaderProps) => {
  return (
    <div
      className={`flex min-h-64 w-full items-center justify-center bg-slate-950 text-slate-100 ${className}`}
      aria-label="Загрузка страницы"
      role="status"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-indigo-400/20 bg-indigo-500/10 shadow-[0_0_28px_rgba(99,102,241,0.35)] animate-ping" />
        <span className="absolute inset-1 rounded-full border border-indigo-300/30" />
        <img
          src="/Glowy.png"
          alt=""
          className="relative h-10 w-10 animate-pulse object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
};

export default RouteLoader;
