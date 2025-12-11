import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createTask, fetchTasks, updateTask } from '../lib/api';
import { trackEvent } from '../lib/telemetry';
import { Task, TaskPriority, TaskStatus } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';

const statusCopy: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

export function TaskList() {
  const queryClient = useQueryClient();
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });
  const [filters, setFilters] = useState<{
    priority: TaskPriority | 'all';
    status: TaskStatus | 'all';
  }>(() => ({ priority: 'all', status: 'all' }));
  const [sort, setSort] = useState<'priority' | 'status'>('priority');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('medium');

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks']) ?? [];
      const optimistic: Task = {
        id: `temp-${Date.now()}`,
        description: '',
        dueDate: new Date().toISOString(),
        status: 'todo',
        ...variables,
      };
      queryClient.setQueryData(['tasks'], [optimistic, ...previous]);
      setQuickTitle('');
      return { previous };
    },
    onSuccess: (task) =>
      trackEvent('task.created', {
        taskId: task.id,
        priority: task.priority,
      }),
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['tasks'], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Task> }) =>
      updateTask(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks']) ?? [];
      queryClient.setQueryData(
        ['tasks'],
        previous.map((task) => (task.id === id ? { ...task, ...patch } : task))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['tasks'], ctx.previous);
    },
    onSuccess: (_task, { patch, id }) => {
      if (patch.priority) {
        trackEvent('task.priority_updated', {
          taskId: id,
          priority: patch.priority,
        });
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const matchesPriority =
        filters.priority === 'all' || task.priority === filters.priority;
      const matchesStatus =
        filters.status === 'all' || task.status === filters.status;
      return matchesPriority && matchesStatus;
    });

    return filtered.sort((a, b) => {
      if (sort === 'priority') {
        const order: TaskPriority[] = ['low', 'medium', 'high'];
        return order.indexOf(a.priority) - order.indexOf(b.priority);
      }
      const order: TaskStatus[] = ['todo', 'in_progress', 'done'];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });
  }, [tasks, filters, sort]);

  return (
    <div className="section-card">
      <header className="section-header">
        <div>
          <p className="helper-text">Workflow</p>
          <h2 className="section-title">Tasks</h2>
        </div>
        <div className="grid-two-col" style={{ maxWidth: 480 }}>
          <div>
            <span className="helper-text">Priority</span>
            <select
              value={filters.priority}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  priority: e.target.value as TaskPriority | 'all',
                }))
              }
              className="section-card"
              style={{ padding: '10px 12px', width: '100%' }}
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <span className="helper-text">Status</span>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as TaskStatus | 'all',
                }))
              }
              className="section-card"
              style={{ padding: '10px 12px', width: '100%' }}
            >
              <option value="all">All</option>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
      </header>

      <div className="section-card" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr auto',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <Input
            label="Quick add"
            placeholder="Write user story, fix regression, ..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
          />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="helper-text">Priority</span>
            <select
              className="section-card"
              value={quickPriority}
              onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
              style={{ padding: '10px 12px' }}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <Button
            onClick={() =>
              quickTitle.trim() &&
              createTaskMutation.mutate({
                title: quickTitle.trim(),
                priority: quickPriority,
              })
            }
            disabled={!quickTitle.trim()}
          >
            Add task
          </Button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 12,
        }}
      >
        <label
          className="helper-text"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          Sort by
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as 'priority' | 'status')}
          >
            <option value="priority">Priority</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredTasks.map((task) => (
          <article
            key={task.id}
            className="section-card"
            style={{ borderColor: 'rgba(255,255,255,0.05)', padding: 14 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div>
                <p className="helper-text">
                  {new Date(task.dueDate ?? Date.now()).toLocaleString()}
                </p>
                <h3 style={{ marginTop: 4 }}>{task.title}</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  className="badge"
                  data-tone={task.status === 'done' ? 'success' : 'info'}
                >
                  {statusCopy[task.status]}
                </span>
                <select
                  value={task.priority}
                  onChange={(e) =>
                    updateTaskMutation.mutate({
                      id: task.id,
                      patch: { priority: e.target.value as TaskPriority },
                    })
                  }
                  style={{
                    background: 'transparent',
                    color: 'white',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '6px 8px',
                  }}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={task.status}
                  onChange={(e) =>
                    updateTaskMutation.mutate({
                      id: task.id,
                      patch: { status: e.target.value as TaskStatus },
                    })
                  }
                >
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
