import TaskList from "../components/tasks/TaskList";

const TaskPage = () => {
  return (
    <div className="flex flex-col gap-8 px-4 md:px-8 max-w-5xl mx-auto w-full">
      <TaskList />
    </div>
  );
};

export default TaskPage;
