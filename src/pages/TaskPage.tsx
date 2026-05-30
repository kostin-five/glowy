import TaskControls from "../components/tasks/TaskControls";
import TaskList from "../components/tasks/TaskList";
import Spinner from "../components/ui/Spinner";
import { useIsLoading } from "../store/useTaskStore";

const TaskPage = () => {
  const isLoading = useIsLoading();
  return (
    <div className="flex flex-col gap-8 px-4 md:px-8 max-w-5xl mx-auto w-full">
      <h1 className="font-display text-3xl font-bold text-slate-100">
        Твои задачи
      </h1>
      <TaskControls />
      {isLoading ? (
        <Spinner />
      ) : (
        <TaskList />
      )}
    </div>
  );
};

export default TaskPage;
