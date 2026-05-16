import { motion } from "framer-motion";

const Spinner = () => {
  return (
    <div className="flex flex-col justify-center items-center h-full min-h-37.5 space-y-4">
      <motion.div
        animate={{
          opacity: [0.3, 1, 0.3],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
      >
        <div className="w-4 h-4 bg-indigo-500/80 rounded-full blur-[1px]" />
      </motion.div>
      <span className="text-sm text-indigo-400/60 font-medium uppercase tracking-widest animate-pulse">
        Синхронизация...
      </span>
    </div>
  );
};

export default Spinner;
