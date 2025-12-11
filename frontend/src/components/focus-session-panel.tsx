import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  completeFocusSession,
  createBreak,
  createFocusSession,
  fetchBreaks,
  fetchFocusSessions,
} from '../lib/api';
import { trackEvent } from '../lib/telemetry';
import { FocusSession, ScheduledBreak, Task } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';

const MOCK_USER_ID = 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111';

export function FocusSessionPanel({ tasks }: { tasks: Task[] }) {
  const [selectedTask, setSelectedTask] = useState(tasks[0]?.id ?? '');
  const [plannedMinutes, setPlannedMinutes] = useState(50);
  const [goal, setGoal] = useState('Ship core flow');
  const [actualMinutes, setActualMinutes] = useState(45);
  const [breakDuration, setBreakDuration] = useState(10);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!selectedTask && tasks[0]?.id) {
      setSelectedTask(tasks[0].id);
    }
  }, [selectedTask, tasks]);

  const { data: sessions = [] } = useQuery({
    queryKey: ['focusSessions'],
    queryFn: fetchFocusSessions,
  });
  const { data: scheduledBreaks = [] } = useQuery({
    queryKey: ['breaks'],
    queryFn: fetchBreaks,
  });

  const createSession = useMutation({
    mutationFn: createFocusSession,
    onSuccess: (session) => {
      queryClient.setQueryData<FocusSession[]>(['focusSessions'], (prev) => [
        session,
        ...(prev ?? []),
      ]);
    },
  });

  const completeSession = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) =>
      completeFocusSession(id, { actualMinutes: minutes }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['focusSessions'] });
      trackEvent('focus_session.completed', {
        sessionId: session.id,
        actualMinutes: session.actualMinutes,
      });
    },
  });

  const scheduleBreak = useMutation({
    mutationFn: createBreak,
    onSuccess: (scheduledBreak) => {
      queryClient.setQueryData<ScheduledBreak[]>(['breaks'], (prev) => [
        scheduledBreak,
        ...(prev ?? []),
      ]);
      trackEvent('break.scheduled', {
        breakId: scheduledBreak.id,
        start: scheduledBreak.start,
      });
    },
  });

  const activeSession = useMemo(
    () => sessions.find((session) => session.status === 'active'),
    [sessions]
  );

  const handleStart = () => {
    if (!selectedTask) return;
    createSession.mutate({
      userId: MOCK_USER_ID,
      taskId: selectedTask,
      plannedMinutes,
      goal,
    });
  };

  const handleComplete = () => {
    if (!activeSession) return;
    completeSession.mutate({ id: activeSession.id, minutes: actualMinutes });
  };

  const handleBreak = () => {
    if (!activeSession) return;
    const start = new Date();
    scheduleBreak.mutate({
      userId: MOCK_USER_ID,
      focusSessionId: activeSession.id,
      type: breakDuration <= 5 ? 'micro' : breakDuration <= 15 ? 'short' : 'long',
      start: start.toISOString(),
      end: new Date(start.getTime() + breakDuration * 60 * 1000).toISOString(),
    });
  };

  return (
    <div className="section-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <header className="section-header">
        <div>
          <p className="helper-text">Focus timer</p>
          <h2 className="section-title">Sessions & breaks</h2>
        </div>
      </header>

      <div className="grid-two-col">
        <div className="section-card" style={{ background: 'var(--color-surface-alt)' }}>
          <label className="helper-text">Task</label>
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="section-card"
            style={{ padding: '8px 10px', width: '100%' }}
          >
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
          <Input
            label="Planned minutes"
            type="number"
            value={plannedMinutes}
            onChange={(e) => setPlannedMinutes(Number(e.target.value))}
          />
          <Input
            label="Goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          <Button onClick={handleStart} disabled={!selectedTask || createSession.isPending}>
            Start focus session
          </Button>
        </div>
        <div className="section-card" style={{ background: 'var(--color-surface-alt)' }}>
          <p className="helper-text">
            {activeSession
              ? `Active session ${activeSession.id}`
              : 'No active focus sessions'}
          </p>
          <Input
            label="Actual minutes"
            type="number"
            value={actualMinutes}
            onChange={(e) => setActualMinutes(Number(e.target.value))}
          />
          <Button onClick={handleComplete} disabled={!activeSession || completeSession.isPending}>
            Complete session
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <Input
              label="Break duration"
              type="number"
              value={breakDuration}
              onChange={(e) => setBreakDuration(Number(e.target.value))}
            />
            <Button onClick={handleBreak} disabled={!activeSession || scheduleBreak.isPending}>
              Schedule break
            </Button>
          </div>
          <p className="helper-text">
            Upcoming breaks: {scheduledBreaks.length}
          </p>
        </div>
      </div>
    </div>
  );
}
