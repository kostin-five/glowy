import TaskForm from "../components/tasks/TaskForm";
import TaskList from "../components/tasks/TaskList";

const TaskPage = () => {
  return (
    <div className="flex flex-col gap-8 px-15 max-w-5xl mx-auto w-full">
      <TaskForm />
      <TaskList />
    </div>
  );
};

export default TaskPage;
