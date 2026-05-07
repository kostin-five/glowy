import { useMemo } from "react";
import { useTasks } from "../store/useTaskStore";

const useTaskStats = () => {
  const tasks = useTasks();
  const countTasks = tasks.length;

  const calcCompletedTasks = useMemo(() => {
    return tasks.filter((task) => task.completed).length;
  }, [tasks]);

  const progressPercent = countTasks
    ? Math.floor((calcCompletedTasks / tasks.length) * 100)
    : "0";
  return { countTasks, calcCompletedTasks, progressPercent };
};

export default useTaskStats;
