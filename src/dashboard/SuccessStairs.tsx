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
      className="drop-shadow-[0_0_16px_rgba(255,255,255,0.8)]"
      style={{ width: size, height: size }}
      animate={{ y: isMoving ? [0, -3, 0] : 0 }}
      transition={stepTransition}
    >
      <motion.g
        fill="none"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ rotate: isMoving ? [-2, 4, -2] : 0 }}
        style={{ transformOrigin: "36px 28px" }}
        transition={stepTransition}
      >
        <circle cx="36" cy="11" r="6" fill="white" stroke="none" />
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
  const centerOffset = Math.floor(safeVisibleSteps / 2);
  const startLevel = Math.max(1, safeLevel - centerOffset);
  const steps = Array.from(
    { length: safeVisibleSteps },
    (_, index) => startLevel + index
  );
  const activeIndex = steps.findIndex((step) => step === safeLevel);
  const thickness = 8;
  const stepSize = 100 / safeVisibleSteps;
  const runnerIndex = activeIndex === -1 ? centerOffset : activeIndex;
  const previousLevelRef = useRef(safeLevel);
  const [isStepping, setIsStepping] = useState(false);
  const runnerSize =
    safeVisibleSteps >= 7 ? 42 : safeVisibleSteps >= 5 ? 52 : 64;
  const runnerLeftOffset =
    safeVisibleSteps >= 7 ? 4 : safeVisibleSteps >= 5 ? 6 : 8;
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
    <div className="relative w-full h-full flex flex-col items-center justify-center pb-10 pt-8 overflow-hidden">
      <div className="absolute top-0 left-0 w-full text-center">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
          Бесконечная лестница: XP двигает уровень вперёд
        </p>
      </div>

      <div className="relative w-full aspect-square max-w-[340px] 2xl:max-w-112.5">
        <motion.div
          className="absolute z-30"
          initial={false}
          style={runnerPosition}
          animate={runnerPosition}
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
              {index === 0 && (
                <div
                  className={`absolute z-0 transition-all duration-700 ${
                    isReached ? activeStyle : inactiveStyle
                  }`}
                  style={{
                    width: `${thickness}px`,
                    height: "40px",
                    left: "0px",
                    bottom: "-40px",
                  }}
                />
              )}

              <div
                className={`absolute z-10 transition-all duration-700 ${
                  isReached ? activeStyle : inactiveStyle
                }`}
                style={{
                  height: `${thickness}px`,
                  width: `calc(${stepSize}% + ${thickness}px)`,
                  left: `${index * stepSize}%`,
                  bottom: `${index * stepSize}%`,
                  borderRadius:
                    index === 0 || index === steps.length - 1 ? "8px" : "0px",
                }}
              />

              <span
                className={`absolute text-sm font-black transition-colors duration-700 ${
                  isReached ? "text-indigo-300" : "text-slate-600"
                }`}
                style={{
                  left: `calc(${index * stepSize}% + 24px)`,
                  bottom: `calc(${index * stepSize}% - 30px)`,
                }}
              >
                {step.toString().padStart(2, "0")}
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
                    bottom: `${index * stepSize}%`,
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
