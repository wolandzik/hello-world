import { useEffect, useState } from 'react';
import styles from './index.module.css';

type Task = {
  id: string;
  title: string;
  status: string;
};

type Timeblock = {
  id: string;
  taskId?: string | null;
  startAt: string;
  endAt: string;
  status: string;
};

const fallbackTasks: Task[] = [
  { id: 't-1', title: 'Finish onboarding doc', status: 'todo' },
  { id: 't-2', title: 'Plan weekly priorities', status: 'in_progress' },
];

const fallbackBlocks: Timeblock[] = [
  {
    id: 'tb-1',
    taskId: 't-1',
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    status: 'tentative',
  },
];

export default function PlannerPage() {
  const [tasks, setTasks] = useState<Task[]>(fallbackTasks);
  const [timeblocks, setTimeblocks] = useState<Timeblock[]>(fallbackBlocks);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [taskRes, blockRes] = await Promise.all([
          fetch('/api/tasks?userId=demo'),
          fetch('/api/timeblocks?userId=demo'),
        ]);

        if (taskRes.ok) {
          const data = await taskRes.json();
          setTasks(Array.isArray(data) ? data : data.tasks ?? fallbackTasks);
        }

        if (blockRes.ok) {
          const data = await blockRes.json();
          setTimeblocks(Array.isArray(data) ? data : data ?? fallbackBlocks);
        }
      } catch (error) {
        console.warn('Falling back to sample planner data', error);
      }
    };

    fetchData();
  }, []);

  return (
    <main className={styles.main}>
      <div className={styles.grid}>
        <section>
          <h1>Tasks</h1>
          <ul>
            {tasks.map((task) => (
              <li key={task.id}>
                <strong>{task.title}</strong>
                <div className={styles.description}>Status: {task.status}</div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h1>Timeblocks</h1>
          <ul>
            {timeblocks.map((block) => (
              <li key={block.id}>
                <div>{new Date(block.startAt).toLocaleTimeString()} → {new Date(block.endAt).toLocaleTimeString()}</div>
                <div className={styles.description}>Status: {block.status}</div>
                {block.taskId && <div className={styles.description}>Task: {block.taskId}</div>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
