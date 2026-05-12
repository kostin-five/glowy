import { motion } from "framer-motion";

interface ISuccessStairs {
  currentLevel: number;
}

const SuccessStairs = ({ currentLevel = 1 }: ISuccessStairs) => {
  const steps = [1, 2, 3, 4, 5];

  // Увеличенные размеры лестницы
  const stepWidth = 90;
  const stepHeight = 80;
  const thickness = 8; // Толщина линий (8px)

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center pb-12 pt-8">
      {/* Подзаголовок компонента */}
      <div className="absolute top-0 left-0 w-full text-center">
        <p className="text-[11px] text-slate-500 uppercase tracking-widest font-black">
          Прогресс: 1 уровень = 3 задачи
        </p>
      </div>

      <div
        className="relative mt-8"
        style={{
          width: `${steps.length * stepWidth}px`,
          height: `${steps.length * stepHeight}px`,
        }}
      >
        {/* Стикмен */}
        <motion.img
          src="/Runner_stickman.png"
          alt="Стикмен"
          className="absolute z-30 w-14 h-14 invert brightness-200 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
          animate={{
            bottom: `${(currentLevel - 1) * stepHeight + 12}px`,
            left: `${(currentLevel - 1) * stepWidth + 20}px`,
          }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
        />

        {steps.map((step) => {
          const isReached = currentLevel >= step;
          const isPassed = currentLevel > step;

          // Единый стиль свечения для всех активных линий
          const activeStyle =
            "bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)]";
          const inactiveStyle = "bg-slate-800";

          return (
            <div key={step}>
              {/* 0. Начальная вертикальная линия (идет вниз в пол) */}
              {step === 1 && (
                <div
                  className={`absolute transition-all duration-700 z-0 ${
                    isReached ? activeStyle : inactiveStyle
                  }`}
                  style={{
                    width: `${thickness}px`,
                    height: `40px`, // Сделали короче, чтобы не вылезала за карточку
                    left: `0px`,
                    bottom: `-40px`,
                    // Убрали borderBottomRadius, чтобы она была плоской снизу
                  }}
                />
              )}

              {/* 1. Горизонтальная линия */}
              <div
                className={`absolute transition-all duration-700 z-10 ${
                  isReached ? activeStyle : inactiveStyle
                }`}
                style={{
                  height: `${thickness}px`,
                  width: `${stepWidth + thickness}px`, // Прибавляем толщину, чтобы угол закрылся идеально
                  left: `${(step - 1) * stepWidth}px`,
                  bottom: `${(step - 1) * stepHeight}px`,
                  // Скругляем только внешние края у первой и последней ступени
                  borderTopLeftRadius: step === 1 ? "8px" : "0px",
                  borderTopRightRadius: step === steps.length ? "8px" : "0px",
                  borderBottomRightRadius:
                    step === steps.length ? "8px" : "0px",
                }}
              />

              {/* 2. Номер ступени */}
              <span
                className={`absolute text-sm font-black transition-colors duration-700 ${
                  isReached ? "text-indigo-300" : "text-slate-600"
                }`}
                style={{
                  left: `${(step - 1) * stepWidth + 35}px`,
                  bottom: `${(step - 1) * stepHeight - 35}px`,
                }}
              >
                0{step}
              </span>

              {/* 3. Вертикальная линия вверх (убрали у последнего шага) */}
              {step !== steps.length && (
                <div
                  className={`absolute transition-all duration-700 z-0 ${
                    isPassed ? activeStyle : inactiveStyle
                  }`}
                  style={{
                    width: `${thickness}px`,
                    height: `${stepHeight + thickness}px`,
                    left: `${step * stepWidth}px`,
                    bottom: `${(step - 1) * stepHeight}px`,
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
