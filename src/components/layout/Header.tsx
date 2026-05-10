const Header = ({ openMenu }: { openMenu: () => void }) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between w-full px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 lg:hidden">
      <button
        className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
        onClick={openMenu}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <div className="flex items-center gap-2">
        <img
          src="/Glowy.png"
          alt="Логотип Glowy"
          className="w-10 h-10 object-contain"
        />
        <h2 className="text-xl font-black tracking-tighter text-indigo-500 italic">
          GLOWY<span className="text-slate-200">.AI</span>
        </h2>
      </div>
    </header>
  );
};

export default Header;
