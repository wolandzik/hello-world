import Head from 'next/head';
import { useQuery } from '@tanstack/react-query';

import { CalendarSchedule } from '../components/calendar-schedule';
import { CommandPalette } from '../components/command-palette';
import { TaskList } from '../components/task-list';
import { fetchTasks } from '../lib/api';

export default function Home() {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  return (
    <>
      <Head>
        <title>Productivity Console</title>
        <meta
          name="description"
          content="Tasks, time blocks, and a design system baseline"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <main>
        <div className="layout-grid">
          <div>
            <TaskList />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              className="section-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p className="helper-text">Design system</p>
                <h1 className="section-title">UI primitives</h1>
                <p className="helper-text">
                  Shared buttons, modals, inputs, and badges define the visual
                  language.
                </p>
              </div>
              <CommandPalette />
            </div>
            <CalendarSchedule tasks={tasks} />
          </div>
        </div>
      </main>
    </>
  );
}
