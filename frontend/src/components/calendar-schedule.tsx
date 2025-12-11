import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, {
  DateClickArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createTimeBlock, fetchTimeBlocks, updateTimeBlock } from '../lib/api';
import { Task, TimeBlock } from '../types';

export function CalendarSchedule({ tasks }: { tasks: Task[] }) {
  const queryClient = useQueryClient();
  const { data: timeBlocks = [] } = useQuery({
    queryKey: ['timeblocks'],
    queryFn: fetchTimeBlocks,
  });

  const createMutation = useMutation({
    mutationFn: createTimeBlock,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['timeblocks'] });
      const previous =
        queryClient.getQueryData<TimeBlock[]>(['timeblocks']) ?? [];
      const optimistic: TimeBlock = { ...input, id: `temp-${Date.now()}` };
      queryClient.setQueryData(['timeblocks'], [...previous, optimistic]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['timeblocks'], ctx.previous);
    },
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
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['timeblocks'], ctx.previous);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['timeblocks'] }),
  });

  const events: EventInput[] = useMemo(
    () =>
      timeBlocks.map((block) => ({
        id: block.id,
        title: block.title,
        start: block.start,
        end: block.end,
        backgroundColor: 'rgba(139, 92, 246, 0.9)',
        borderColor: 'transparent',
      })),
    [timeBlocks]
  );

  const handleDateClick = (arg: DateClickArg) => {
    const title = prompt('Name this focus block');
    if (!title) return;
    const start = arg.date;
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    createMutation.mutate({
      start: start.toISOString(),
      end: end.toISOString(),
      title,
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

  return (
    <div className="section-card">
      <header className="section-header">
        <div>
          <p className="helper-text">Calendar</p>
          <h2 className="section-title">Schedule</h2>
        </div>
        <p className="helper-text">
          Drag blocks or click to schedule focus time · {tasks.length} tasks
          cached
        </p>
      </header>
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
        height="auto"
        slotMinTime="07:00:00"
        slotMaxTime="20:00:00"
      />
    </div>
  );
}
