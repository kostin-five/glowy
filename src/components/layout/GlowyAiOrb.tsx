import { useId } from "react";

interface GlowyAiOrbProps {
  isActive: boolean;
  onClick: () => void;
}

const GlowyAiOrb = ({ isActive, onClick }: GlowyAiOrbProps) => {
  const gradientId = useId().replace(/:/g, "");
  const glowId = useId().replace(/:/g, "");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Открыть Glowy AI"
      aria-pressed={isActive}
      className={`group relative flex h-16 w-16 items-center justify-center rounded-full border transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/40 ${
        isActive
          ? "border-cyan-200 bg-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.75)]"
          : "border-cyan-300/80 bg-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.48)]"
      }`}
    >
      <span className="absolute inset-1 rounded-full bg-cyan-400/15 blur-md motion-safe:animate-pulse" />
      <svg
        aria-hidden="true"
        viewBox="0 0 64 64"
        className="relative h-14 w-14 overflow-visible"
      >
        <defs>
          <radialGradient id={gradientId} cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#ecfeff" />
            <stop offset="28%" stopColor="#67e8f9" />
            <stop offset="68%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#4338ca" />
          </radialGradient>
          <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx="32"
          cy="32"
          r="24"
          fill={`url(#${gradientId})`}
          filter={`url(#${glowId})`}
        />
        <circle cx="25" cy="23" r="8" fill="#fff" fillOpacity="0.34" />
        <g
          data-testid="glowy-ai-orbit"
          className="glowy-ai-orbit"
        >
          <ellipse
            cx="32"
            cy="32"
            rx="27"
            ry="18"
            fill="none"
            stroke="#cffafe"
            strokeOpacity="0.72"
            strokeWidth="1.5"
            transform="rotate(-26 32 32)"
          />
          <circle cx="54" cy="20" r="2.8" fill="#ecfeff" />
        </g>
      </svg>
    </button>
  );
};

export default GlowyAiOrb;
