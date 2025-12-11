import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createObjective, fetchObjectives } from '../lib/api';
import { trackEvent } from '../lib/telemetry';
import { Objective } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';

const MOCK_USER_ID = 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111';

export function WeeklyObjectives() {
  const [title, setTitle] = useState('Ship onboarding beta');
  const [criteria, setCriteria] = useState('3 pilot users activate');
  const [timeframe, setTimeframe] = useState<'this_week' | 'next_week'>('this_week');
  const queryClient = useQueryClient();

  const { data: objectives = [] } = useQuery({
    queryKey: ['objectives'],
    queryFn: fetchObjectives,
  });

  const createObjectiveMutation = useMutation({
    mutationFn: createObjective,
    onSuccess: (objective) => {
      queryClient.setQueryData<Objective[]>(['objectives'], (prev) => [
        objective,
        ...(prev ?? []),
      ]);
      trackEvent('objective.created', {
        objectiveId: objective.id,
        timeframe: objective.timeframe,
      });
      setTitle('');
      setCriteria('');
    },
  });

  return (
    <div className="section-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <header className="section-header">
        <div>
          <p className="helper-text">Weekly intentions</p>
          <h2 className="section-title">Objectives</h2>
        </div>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as 'this_week' | 'next_week')}
          className="section-card"
          style={{ padding: '8px 10px' }}
        >
          <option value="this_week">This week</option>
          <option value="next_week">Next week</option>
        </select>
      </header>

      <div className="grid-two-col">
        <div className="section-card" style={{ background: 'var(--color-surface-alt)' }}>
          <Input
            label="Objective title"
            value={title}
            placeholder="Ship onboarding beta"
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label="Success criteria"
            value={criteria}
            placeholder="Three customers complete guided tour"
            onChange={(e) => setCriteria(e.target.value)}
          />
          <Button
            onClick={() =>
              title.trim() &&
              createObjectiveMutation.mutate({
                userId: MOCK_USER_ID,
                title: title.trim(),
                timeframe,
                successCriteria: criteria || undefined,
              })
            }
            disabled={!title.trim() || createObjectiveMutation.isPending}
          >
            Add objective
          </Button>
        </div>
        <div className="section-card" style={{ background: 'var(--color-surface-alt)' }}>
          <p className="helper-text">Weekly board</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {objectives
              .filter((objective) => objective.timeframe === timeframe)
              .map((objective) => (
                <div key={objective.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{objective.title}</strong>
                    <p className="helper-text">{objective.successCriteria}</p>
                  </div>
                  <span className="badge" data-tone="info">
                    {objective.status}
                  </span>
                </div>
              ))}
            {objectives.filter((objective) => objective.timeframe === timeframe).length === 0 && (
              <p className="helper-text">No objectives logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
