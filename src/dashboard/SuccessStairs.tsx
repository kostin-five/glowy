import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface ISuccessStairs {
  currentLevel: number;
  visibleSteps?: number;
}

const StepRunner = ({
  isMoving,
  size,
}: {
  isMoving: boolean;
  size: number;
}) => {
  const stepTransition = {
    duration: 0.58,
    repeat: Infinity,
    ease: "easeInOut" as const,
  };

  return (
    <motion.svg
      viewBox="0 0 72 72"
      className="text-slate-800 drop-shadow-[0_0_14px_rgba(15,23,42,0.22)] dark:text-white dark:drop-shadow-[0_0_16px_rgba(255,255,255,0.8)]"
      style={{ width: size, height: size }}
      animate={{ y: isMoving ? [0, -3, 0] : 0 }}
      transition={stepTransition}
    >
      <motion.g
        fill="none"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ rotate: isMoving ? [-2, 4, -2] : 0 }}
        style={{ transformOrigin: "36px 28px" }}
        transition={stepTransition}
      >
        <circle cx="36" cy="11" r="6" fill="currentColor" stroke="none" />
        <path d="M36 19 L34 35" />
        <motion.path
          d="M35 25 L22 33"
          animate={{ rotate: isMoving ? [-20, 12, -20] : 0 }}
          style={{ transformOrigin: "35px 25px" }}
          transition={stepTransition}
        />
        <motion.path
          d="M35 25 L50 31"
          animate={{ rotate: isMoving ? [16, -10, 16] : 0 }}
          style={{ transformOrigin: "35px 25px" }}
          transition={stepTransition}
        />
        <motion.path
          d="M34 35 L24 55"
          animate={{ rotate: isMoving ? [18, -22, 18] : 0 }}
          style={{ transformOrigin: "34px 35px" }}
          transition={stepTransition}
        />
        <motion.path
          d="M34 35 L51 52"
          animate={{ rotate: isMoving ? [-18, 18, -18] : 0 }}
          style={{ transformOrigin: "34px 35px" }}
          transition={stepTransition}
        />
      </motion.g>
    </motion.svg>
  );
};

const SuccessStairs = ({
  currentLevel = 1,
  visibleSteps = 5,
}: ISuccessStairs) => {
  const safeLevel = Math.max(1, currentLevel);
  const safeVisibleSteps = Math.max(3, visibleSteps);
  const centerOffset = Math.floor((safeVisibleSteps - 1) / 2);
  const startLevel = Math.max(1, safeLevel - centerOffset);
  const steps = Array.from(
    { length: safeVisibleSteps },
    (_, index) => startLevel + index
  );
  const activeIndex = steps.findIndex((step) => step === safeLevel);
  const isCompact = safeVisibleSteps <= 3;
  const thickness = isCompact ? 7 : safeVisibleSteps >= 7 ? 10 : 8;
  const stepSize = 100 / safeVisibleSteps;
  const runnerIndex = activeIndex === -1 ? centerOffset : activeIndex;
  const previousLevelRef = useRef(safeLevel);
  const [isStepping, setIsStepping] = useState(false);
  const runnerSize =
    safeVisibleSteps >= 7 ? 54 : safeVisibleSteps >= 5 ? 44 : 34;
  const runnerLeftOffset =
    safeVisibleSteps >= 7 ? 4 : safeVisibleSteps >= 5 ? 0 : 0;
  const baselineOffset = isCompact ? 30 : 32;
  const canvasSizeClass =
    isCompact
      ? "max-w-[190px] 2xl:max-w-[210px]"
      : safeVisibleSteps >= 7
      ? "max-w-[390px] sm:max-w-[440px] xl:max-w-[520px] 2xl:max-w-[580px]"
      : "max-w-[340px] 2xl:max-w-112.5";
  const runnerPosition = {
    bottom: `calc(${runnerIndex * stepSize}% + ${thickness + 2}px)`,
    left: `calc(${runnerIndex * stepSize}% + ${runnerLeftOffset}px)`,
  };

  useEffect(() => {
    if (safeLevel > previousLevelRef.current) {
      setIsStepping(true);
      const timer = window.setTimeout(() => setIsStepping(false), 850);
      previousLevelRef.current = safeLevel;

      return () => window.clearTimeout(timer);
    }

    previousLevelRef.current = safeLevel;
    setIsStepping(false);
  }, [safeLevel]);

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center overflow-hidden ${
        isCompact ? "justify-center py-2" : "justify-center pb-12 pt-10"
      }`}
    >
      <div
        className={`absolute top-0 left-0 w-full text-center ${
          isCompact ? "hidden" : "block"
        }`}
      >
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
          Лестница баланса: силы расходуются осознанно
        </p>
      </div>

      <div className={`relative w-full aspect-square ${canvasSizeClass}`}>
        <motion.div
          className="absolute z-30"
          initial={false}
          style={{
            bottom: `calc(${runnerPosition.bottom} + ${baselineOffset}px)`,
            left: runnerPosition.left,
          }}
          animate={{
            bottom: `calc(${runnerPosition.bottom} + ${baselineOffset}px)`,
            left: runnerPosition.left,
          }}
          transition={{ type: "spring", stiffness: 130, damping: 17 }}
        >
          <StepRunner isMoving={isStepping} size={runnerSize} />
        </motion.div>

        {steps.map((step, index) => {
          const isReached = safeLevel >= step;
          const isPassed = safeLevel > step;
          const activeStyle =
            "bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)]";
          const inactiveStyle = "bg-slate-800";

          return (
            <div key={step}>
              <div
                className={`absolute z-10 transition-all duration-700 ${
                  isReached ? activeStyle : inactiveStyle
                }`}
                style={{
                  height: `${thickness}px`,
                  width: `calc(${stepSize}% + ${thickness}px)`,
                  left: `${index * stepSize}%`,
                  bottom: `calc(${index * stepSize}% + ${baselineOffset}px)`,
                  borderRadius:
                    index === 0 || index === steps.length - 1 ? "8px" : "0px",
                }}
              />

              <span
                className={`absolute text-sm font-black transition-colors duration-700 ${
                  isReached ? "text-indigo-300" : "text-slate-600"
                }`}
                style={{
                  left: `calc(${index * stepSize}% + ${isCompact ? 12 : 16}px)`,
                  bottom: `calc(${index * stepSize}% + ${baselineOffset - 26}px)`,
                }}
              >
                <span className={safeVisibleSteps >= 7 ? "text-base xl:text-lg" : ""}>
                  {step.toString().padStart(2, "0")}
                </span>
              </span>

              {index !== steps.length - 1 && (
                <div
                  className={`absolute z-0 transition-all duration-700 ${
                    isPassed ? activeStyle : inactiveStyle
                  }`}
                  style={{
                    width: `${thickness}px`,
                    height: `calc(${stepSize}% + ${thickness}px)`,
                    left: `${(index + 1) * stepSize}%`,
                    bottom: `calc(${index * stepSize}% + ${baselineOffset}px)`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuccessStairs;
