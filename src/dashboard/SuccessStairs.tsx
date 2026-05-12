import { motion } from "framer-motion";

interface ISuccessStairs {
  currentLevel: number;
}

const SuccessStairs = ({ currentLevel = 1 }: ISuccessStairs) => {
  const steps = [1, 2, 3, 4, 5];

  // const stepWidth = 90;
  // const stepHeight = 80;
  const thickness = 8;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center pb-10 pt-8">
      <div className="absolute top-0 left-0 w-full text-center">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
          Прогресс: 1 уровень = 1 задача
        </p>
      </div>

      {/* <div
        className="relative mt-8"
        style={{
          width: `${steps.length * stepWidth}px`,
          height: `${steps.length * stepHeight}px`,
        }}
      > */}
      <div className="relative w-full aspect-square max-w-[320px] 2xl:max-w-112.5">
        <motion.img
          src="/Runner_stickman.png"
          alt="Стикмен"
          className="absolute z-30 w-12 h-12 invert brightness-200 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
          animate={{
            bottom: `calc(${(currentLevel - 1) * 20}% + ${thickness}px)`,
            left: `calc(${(currentLevel - 1) * 20}% + 15px)`,
          }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
        />

        {steps.map((step) => {
          const isReached = currentLevel >= step;
          const isPassed = currentLevel > step;

          const activeStyle =
            "bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)]";
          const inactiveStyle = "bg-slate-800";

          return (
            <div key={step}>
              {step === 1 && (
                <div
                  className={`absolute transition-all duration-700 z-0 ${
                    isReached ? activeStyle : inactiveStyle
                  }`}
                  style={{
                    width: `${thickness}px`,
                    height: `40px`,
                    left: `0px`,
                    bottom: `-40px`,
                  }}
                />
              )}

              <div
                className={`absolute transition-all duration-700 z-10 ${
                  isReached ? activeStyle : inactiveStyle
                }`}
                style={{
                  height: `${thickness}px`,
                  width: `calc(20% + ${thickness}px)`,
                  left: `${(step - 1) * 20}%`,
                  bottom: `${(step - 1) * 20}%`,
                  borderTopLeftRadius: step === 1 ? "8px" : "0px",
                  borderTopRightRadius: step === steps.length ? "8px" : "0px",
                  borderBottomRightRadius:
                    step === steps.length ? "8px" : "0px",
                }}
              />

              <span
                className={`absolute text-sm font-black transition-colors duration-700 ${
                  isReached ? "text-indigo-300" : "text-slate-600"
                }`}
                style={{
                  left: `calc(${(step - 1) * 20}% + 25px)`,
                  bottom: `calc(${(step - 1) * 20}% - 30px)`,
                }}
              >
                0{step}
              </span>

              {step !== steps.length && (
                <div
                  className={`absolute transition-all duration-700 z-0 ${
                    isPassed ? activeStyle : inactiveStyle
                  }`}
                  style={{
                    width: `${thickness}px`,
                    height: `calc(20% + ${thickness}px)`,
                    left: `${step * 20}%`,
                    bottom: `${(step - 1) * 20}%`,
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
