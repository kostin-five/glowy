export interface Task {
  id: number;
  title: string;
  date: string;
  priority: "Важно" | "Нормально" | "Не срочно";
  category: string;
  completed: boolean;
}
