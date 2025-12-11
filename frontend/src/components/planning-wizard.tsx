import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  completePlanningSession,
  createHighlight,
  fetchHighlights,
  listPlanningSessions,
  startPlanningSession,
} from '../lib/api';
import { trackEvent } from '../lib/telemetry';
import { Highlight, PlanningSession, PlanningSessionType } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';

const MOCK_USER_ID = 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111';

export function PlanningWizard() {
  const [sessionType, setSessionType] = useState<PlanningSessionType>('morning');
  const [highlightTitle, setHighlightTitle] = useState('');
  const [reflection, setReflection] = useState('');
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useQuery({
    queryKey: ['planningSessions'],
    queryFn: listPlanningSessions,
  });

  const { data: highlights = [] } = useQuery({
    queryKey: ['highlights'],
    queryFn: fetchHighlights,
  });

  const startMutation = useMutation({
    mutationFn: startPlanningSession,
    onSuccess: (session) => {
      queryClient.setQueryData<PlanningSession[]>(['planningSessions'], (prev) => [
        session,
        ...(prev ?? []),
      ]);
    },
  });

  const highlightMutation = useMutation({
    mutationFn: createHighlight,
    onSuccess: (highlight) => {
      queryClient.setQueryData<Highlight[]>(['highlights'], (prev) => [
        highlight,
        ...(prev ?? []),
      ]);
      trackEvent('highlight.created', {
        highlightId: highlight.id,
        date: highlight.date,
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<PlanningSession>;
    }) => completePlanningSession(id, patch),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['planningSessions'] });
      trackEvent('planning_session.completed', {
        sessionId: session.id,
        type: session.type,
      });
    },
  });

  const activeSession = useMemo(
    () => sessions.find((session) => session.status === 'in_progress'),
    [sessions]
  );

  const lastCompleted = useMemo(
    () => sessions.find((session) => session.status === 'completed'),
    [sessions]
  );

  const handleStart = () => {
    startMutation.mutate({
      userId: MOCK_USER_ID,
      type: sessionType,
      context: 'work',
      scheduledFor: new Date().toISOString(),
    });
  };

  const handleComplete = async () => {
    const session = activeSession;
    if (!session) return;
    let highlightId = session.highlightId;
    if (highlightTitle.trim()) {
      const created = await highlightMutation.mutateAsync({
        userId: MOCK_USER_ID,
        title: highlightTitle.trim(),
        date: new Date().toISOString().slice(0, 10),
        intention: reflection || undefined,
      });
      highlightId = created.id;
    }

    await completeMutation.mutateAsync({
      id: session.id,
      patch: {
        reflection: reflection || undefined,
        highlightId,
      },
    });

    setHighlightTitle('');
    setReflection('');
  };

  return (
    <div className="section-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <header className="section-header">
        <div>
          <p className="helper-text">Planning ritual</p>
          <h2 className="section-title">Daily check-in</h2>
        </div>
        <Button onClick={handleStart} disabled={startMutation.isPending}>
          Start {sessionType} session
        </Button>
      </header>

      <div className="grid-two-col">
        <div className="section-card" style={{ background: 'var(--color-surface-alt)' }}>
          <Input
            label="Highlight for today"
            value={highlightTitle}
            placeholder="Ship onboarding beta"
            onChange={(e) => setHighlightTitle(e.target.value)}
          />
          <Input
            label="Reflection or plan"
            value={reflection}
            placeholder="Plan focus blocks, review blockers"
            onChange={(e) => setReflection(e.target.value)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="helper-text">Session</label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value as PlanningSessionType)}
              className="section-card"
              style={{ padding: '8px 10px' }}
            >
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
            </select>
            <Button onClick={handleComplete} disabled={!activeSession && !highlightTitle}>
              Log highlight & complete
            </Button>
          </div>
          {activeSession ? (
            <p className="helper-text">Session {activeSession.id} is in progress.</p>
          ) : (
            <p className="helper-text">Start a session to collect highlights and reflections.</p>
          )}
        </div>
        <div className="section-card" style={{ background: 'var(--color-surface-alt)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p className="helper-text">Latest outcomes</p>
          {lastCompleted ? (
            <>
              <h3 style={{ margin: 0 }}>Completed {lastCompleted.type} session</h3>
              <p className="helper-text">
                {lastCompleted.completedAt
                  ? new Date(lastCompleted.completedAt).toLocaleString()
                  : 'Recently finished'}
              </p>
            </>
          ) : (
            <p className="helper-text">No completed sessions yet.</p>
          )}
          <p className="helper-text">
            Upcoming highlight: {highlights[0]?.title ?? 'Capture your focus' }
          </p>
        </div>
      </div>
    </div>
  );
}
