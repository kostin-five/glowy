interface AuthLoaderProps {
  className?: string;
}

const AuthLoader = ({ className = "" }: AuthLoaderProps) => {
  return (
    <span
      aria-label="Загрузка"
      className={`block h-5 w-5 rounded-full border-2 border-indigo-300/20 border-t-indigo-400 shadow-[0_0_14px_rgba(99,102,241,0.75)] animate-spin ${className}`}
    />
  );
};

export default AuthLoader;
