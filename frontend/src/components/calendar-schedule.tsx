import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, {
  DateClickArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import {
  createChannel,
  createTimeBlock,
  fetchCalendarStatus,
  fetchChannels,
  fetchTimeBlocks,
  pollCalendar,
  connectCalendar,
  disconnectCalendar,
  suggestTimeBlock,
  updateTimeBlock,
} from '../lib/api';
import { trackEvent } from '../lib/telemetry';
import { Channel, Task, TimeBlock, TimeBlockStatus } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';

const DEFAULT_DURATION_MIN = 60;

const nextStatus = (status: TimeBlockStatus): TimeBlockStatus => {
  const order: TimeBlockStatus[] = ['tentative', 'confirmed', 'completed'];
  const idx = order.indexOf(status);
  return order[(idx + 1) % order.length];
};

const getChannelColor = (channelId: string | undefined | null, channels: Channel[]) =>
  channels.find((channel) => channel.id === channelId)?.color ??
  'rgba(139, 92, 246, 0.9)';

const findConflicts = (blocks: TimeBlock[]) => {
  const conflicts = new Set<string>();
  const sorted = [...blocks].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (new Date(sorted[i].end) <= new Date(sorted[j].start)) break;
      const overlaps =
        new Date(sorted[i].start) < new Date(sorted[j].end) &&
        new Date(sorted[i].end) > new Date(sorted[j].start);
      if (overlaps) {
        conflicts.add(sorted[i].id);
        conflicts.add(sorted[j].id);
      }
    }
  }

  return conflicts;
};

export function CalendarSchedule({ tasks }: { tasks: Task[] }) {
  const queryClient = useQueryClient();
  const { data: timeBlocks = [] } = useQuery({
    queryKey: ['timeblocks'],
    queryFn: fetchTimeBlocks,
  });
  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: fetchChannels,
  });
  const { data: calendarStatus } = useQuery({
    queryKey: ['calendarStatus'],
    queryFn: fetchCalendarStatus,
  });

  const [selectedChannel, setSelectedChannel] = useState<'all' | string>('all');
  const [defaultDuration, setDefaultDuration] = useState(DEFAULT_DURATION_MIN);
  const [quickTitle, setQuickTitle] = useState('');
  const [taskForBlocks, setTaskForBlocks] = useState<string | 'none'>('none');
  const [channelName, setChannelName] = useState('');
  const [channelColor, setChannelColor] = useState('#7c3aed');

  const filteredBlocks = useMemo(
    () =>
      selectedChannel === 'all'
        ? timeBlocks
        : timeBlocks.filter((block) => block.channelId === selectedChannel),
    [selectedChannel, timeBlocks]
  );

  const conflicts = useMemo(
    () => findConflicts(filteredBlocks),
    [filteredBlocks]
  );

  const createChannelMutation = useMutation({
    mutationFn: createChannel,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['channels'] });
      const previous = queryClient.getQueryData<Channel[]>(['channels']) ?? [];
      const optimistic: Channel = { ...input, id: `temp-${Date.now()}` };
      queryClient.setQueryData(['channels'], [...previous, optimistic]);
      setChannelName('');
      return { previous };
    },
    onError: (_error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['channels'], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  });

  const createMutation = useMutation({
    mutationFn: createTimeBlock,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['timeblocks'] });
      const previous = queryClient.getQueryData<TimeBlock[]>(['timeblocks']) ?? [];
      const optimistic: TimeBlock = {
        status: input.status ?? 'tentative',
        id: `temp-${Date.now()}`,
        ...input,
      };
      queryClient.setQueryData(['timeblocks'], [...previous, optimistic]);
      setQuickTitle('');
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['timeblocks'], ctx.previous);
      if (err instanceof Error) alert(err.message);
    },
    onSuccess: (block) =>
      trackEvent('timeblock.scheduled', {
        blockId: block.id,
        start: block.start,
        end: block.end,
        channelId: block.channelId,
      }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['timeblocks'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TimeBlock> }) =>
      updateTimeBlock(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ['timeblocks'] });
      const previous =
        queryClient.getQueryData<TimeBlock[]>(['timeblocks']) ?? [];
      queryClient.setQueryData(
        ['timeblocks'],
        previous.map((block) =>
          block.id === id ? { ...block, ...patch } : block
        )
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['timeblocks'], ctx.previous);
      if (err instanceof Error) alert(err.message);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['timeblocks'] }),
  });

  const suggestMutation = useMutation({
    mutationFn: suggestTimeBlock,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['timeblocks'] });
    },
    onError: (err) => {
      if (err instanceof Error) alert(err.message);
    },
    onSuccess: (_response, variables) => {
      trackEvent('calendar.auto_schedule', {
        taskId: variables.taskId,
        durationMinutes: variables.durationMinutes,
      });
      queryClient.invalidateQueries({ queryKey: ['timeblocks'] });
    },
  });

  const connectMutation = useMutation({
    mutationFn: connectCalendar,
    onSuccess: (status) => {
      trackEvent('calendar.connected', { provider: status.provider });
      queryClient.invalidateQueries({ queryKey: ['calendarStatus'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectCalendar,
    onSuccess: (status) => {
      trackEvent('calendar.disconnected', { provider: status.provider });
      queryClient.invalidateQueries({ queryKey: ['calendarStatus'] });
    },
  });

  const pollMutation = useMutation({
    mutationFn: pollCalendar,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['calendarStatus'] });
      queryClient.invalidateQueries({ queryKey: ['timeblocks'] });
      trackEvent('calendar.synced', { synced: result.synced });
    },
  });

  const events: EventInput[] = useMemo(() => {
    return filteredBlocks.map((block) => {
      const color = getChannelColor(block.channelId, channels);
      const isConflict = conflicts.has(block.id);
      return {
        id: block.id,
        title: `${block.title} · ${block.status}`,
        start: block.start,
        end: block.end,
        backgroundColor: isConflict ? 'rgba(239, 68, 68, 0.85)' : color,
        borderColor: 'transparent',
      };
    });
  }, [channels, conflicts, filteredBlocks]);

  const handleDateClick = (arg: DateClickArg) => {
    const selectedTask = tasks.find((task) => task.id === taskForBlocks);
    const title = quickTitle.trim() || selectedTask?.title || 'Focus block';
    const start = arg.date;
    const end = new Date(start.getTime() + defaultDuration * 60 * 1000);

    createMutation.mutate({
      start: start.toISOString(),
      end: end.toISOString(),
      title,
      taskId: selectedTask?.id,
      channelId: selectedChannel === 'all' ? undefined : selectedChannel,
      status: 'tentative',
    });
  };

  const handleDrop = (event: EventDropArg) => {
    const id = event.event.id;
    updateMutation.mutate({
      id,
      patch: {
        start: event.event.start?.toISOString(),
        end: event.event.end?.toISOString(),
      },
    });
  };

  const handleEventClick = (arg: EventClickArg) => {
    const block = timeBlocks.find((item) => item.id === arg.event.id);
    if (!block) return;

    updateMutation.mutate({
      id: block.id,
      patch: { status: nextStatus(block.status) },
    });
  };

  const handleAutoSchedule = () => {
    if (taskForBlocks === 'none') {
      alert('Select a task to auto-schedule');
      return;
    }

    const selectedTask = tasks.find((task) => task.id === taskForBlocks);
    if (!selectedTask) return;

    suggestMutation.mutate({
      taskId: selectedTask.id,
      title: selectedTask.title,
      durationMinutes: defaultDuration,
      channelId: selectedChannel === 'all' ? null : selectedChannel,
    });
  };

  return (
    <div className="section-card">
      <header className="section-header">
        <div>
          <p className="helper-text">Calendar</p>
          <h2 className="section-title">Schedule</h2>
          <p className="helper-text">
            Drag blocks, resize them, and switch channels to timebox your day.
          </p>
        </div>
        <div className="grid-two-col" style={{ gap: 10, maxWidth: 420 }}>
          <div>
            <label className="helper-text" htmlFor="channel-view-select">
              Channel view
            </label>
            <select
              id="channel-view-select"
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="section-card"
              style={{ padding: '10px 12px', width: '100%' }}
              aria-label="Filter calendar by channel"
            >
              <option value="all">All channels</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Input
              label="Default duration (minutes)"
              type="number"
              min={15}
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(Number(e.target.value))}
            />
          </div>
        </div>
      </header>

      <div
        className="section-card"
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}
      >
        <div style={{ flex: 1 }}>
          <p className="helper-text">Sync</p>
          <h3 style={{ margin: 0 }}>Google Calendar</h3>
          <p className="helper-text" role="status" aria-live="polite">
            Status: {calendarStatus?.status ?? 'checking'}
            {calendarStatus?.lastSyncedAt &&
              ` · Last sync ${new Date(calendarStatus.lastSyncedAt).toLocaleString()}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {calendarStatus?.status === 'connected' ? (
            <Button
              variant="secondary"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              aria-label="Disconnect Google Calendar"
            >
              Disconnect
            </Button>
          ) : (
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              aria-label="Connect Google Calendar"
            >
              Connect
            </Button>
          )}
          <Button
            onClick={() => pollMutation.mutate()}
            disabled={pollMutation.isPending || calendarStatus?.status !== 'connected'}
            aria-label="Sync calendar events now"
          >
            Sync now
          </Button>
        </div>
      </div>

      {conflicts.size > 0 && (
        <div
          className="section-card"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            borderColor: 'rgba(239, 68, 68, 0.25)',
            marginBottom: 12,
          }}
        >
          <p className="helper-text" style={{ color: '#fca5a5' }}>
            {conflicts.size} block(s) overlap. Drag to resolve or shorten them.
          </p>
        </div>
      )}

      <div
        className="section-card"
        style={{
          marginBottom: 14,
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 1fr auto',
          gap: 10,
          alignItems: 'end',
        }}
      >
        <Input
          label="Block title"
          placeholder="Deep work, backlog triage..."
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
        />
        <label className="helper-text" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          Task to timebox
          <select
            value={taskForBlocks}
            onChange={(e) => setTaskForBlocks(e.target.value as string | 'none')}
            className="section-card"
            style={{ padding: '10px 12px' }}
          >
            <option value="none">Unassigned block</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </label>
        <label className="helper-text" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          Channel
          <select
            id="channel-for-blocks"
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="section-card"
            style={{ padding: '10px 12px' }}
            aria-label="Channel for the new time block"
          >
            <option value="all">Use default channel</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            onClick={() => alert('Click on the calendar to drop the block')}
            aria-label="Pick a slot on the calendar"
          >
            Pick a slot
          </Button>
          <Button
            variant="secondary"
            onClick={handleAutoSchedule}
            disabled={suggestMutation.isPending}
          >
            Auto-schedule
          </Button>
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p className="helper-text">Channels</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {channels.map((channel) => (
                <span
                  key={channel.id}
                  className="badge"
                  data-tone="info"
                  style={{
                    background: `${channel.color ?? 'rgba(255,255,255,0.08)'}`,
                    color: '#0f172a',
                  }}
                >
                  {channel.name}
                </span>
              ))}
            </div>
          </div>
          <form
            style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!channelName.trim()) return;
              createChannelMutation.mutate({
                userId: 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111',
                name: channelName.trim(),
                visibility: 'private',
                color: channelColor,
              });
            }}
          >
            <Input
              label="New channel"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Focus, meetings, personal"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="helper-text">Color</span>
              <input
                type="color"
                aria-label="Channel color"
                value={channelColor}
                onChange={(e) => setChannelColor(e.target.value)}
                style={{ width: 64, height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)' }}
              />
            </div>
            <Button type="submit">Add</Button>
          </form>
        </div>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        selectable
        editable
        eventDurationEditable
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridDay,timeGridWeek,dayGridMonth',
        }}
        events={events}
        dateClick={handleDateClick}
        eventDrop={handleDrop}
        eventResize={handleDrop}
        eventClick={handleEventClick}
        height="auto"
        slotMinTime="07:00:00"
        slotMaxTime="20:00:00"
      />
    </div>
  );
}
