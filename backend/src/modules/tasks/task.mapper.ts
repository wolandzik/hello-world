import type { Task } from '@prisma/client';

export interface TaskResponse {
  id: string;
  userId: string;
  title: string;
  status: string;
  priorityLevel: number;
  priorityScore: number | null;
  dueAt: string | null;
  channelId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const toTaskResponse = (task: Task): TaskResponse => ({
  id: task.id,
  userId: task.user_id,
  title: task.title,
  status: task.status,
  priorityLevel: task.priority_level,
  priorityScore: task.priority_score,
  dueAt: task.due_at ? task.due_at.toISOString() : null,
  channelId: task.channel_id ?? null,
  createdAt: task.created_at.toISOString(),
  updatedAt: task.updated_at.toISOString(),
});
