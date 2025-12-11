export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type Task = {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
};

export type TimeBlock = {
  id: string;
  title: string;
  taskId?: string;
  start: string;
  end: string;
};
