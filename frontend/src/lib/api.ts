import { Task, TaskPriority, TaskStatus, TimeBlock } from '../types';

let tasks: Task[] = [
  {
    id: 't-1',
    title: 'Review research notes',
    priority: 'high',
    status: 'in_progress',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: 't-2',
    title: 'Design onboarding flow',
    priority: 'medium',
    status: 'todo',
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
  },
  {
    id: 't-3',
    title: 'Ship patch release',
    priority: 'high',
    status: 'done',
    dueDate: new Date().toISOString(),
  },
];

let timeBlocks: TimeBlock[] = [
  {
    id: 'b-1',
    title: 'Review research notes',
    taskId: 't-1',
    start: new Date().toISOString(),
    end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  },
];

function simulateLatency<T>(data: T, delay = 120): Promise<T> {
  const clone = JSON.parse(JSON.stringify(data)) as T;
  return new Promise((resolve) => setTimeout(() => resolve(clone), delay));
}

export async function fetchTasks(): Promise<Task[]> {
  return simulateLatency(tasks);
}

export async function fetchTimeBlocks(): Promise<TimeBlock[]> {
  return simulateLatency(timeBlocks);
}

export async function createTask(input: {
  title: string;
  priority: TaskPriority;
  status?: TaskStatus;
}): Promise<Task> {
  const task: Task = {
    id: crypto.randomUUID(),
    description: '',
    dueDate: new Date().toISOString(),
    status: input.status ?? 'todo',
    ...input,
  };
  tasks = [task, ...tasks];
  return simulateLatency(task);
}

export async function updateTask(
  id: string,
  patch: Partial<Task>
): Promise<Task> {
  tasks = tasks.map((task) => (task.id === id ? { ...task, ...patch } : task));
  const updated = tasks.find((task) => task.id === id)!;
  return simulateLatency(updated);
}

export async function createTimeBlock(
  input: Omit<TimeBlock, 'id'>
): Promise<TimeBlock> {
  const block: TimeBlock = { ...input, id: crypto.randomUUID() };
  timeBlocks = [...timeBlocks, block];
  return simulateLatency(block);
}

export async function updateTimeBlock(
  id: string,
  patch: Partial<TimeBlock>
): Promise<TimeBlock> {
  timeBlocks = timeBlocks.map((block) =>
    block.id === id ? { ...block, ...patch } : block
  );
  const updated = timeBlocks.find((block) => block.id === id)!;
  return simulateLatency(updated);
}
