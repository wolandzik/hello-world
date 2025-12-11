import {
  PrismaClient,
  TaskStatus,
  TimeBlockStatus,
  FocusSessionStatus,
  PlanningSessionType,
  PlanningContext,
  PlanningSource,
  ChannelVisibility,
  Provider,
  SyncMode,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: {},
    create: {
      email: 'dev@example.com',
      display_name: 'Dev User',
      onboarding_state: 'completed',
      settings: {
        timeZone: 'UTC',
        workingHours: { start: '09:00', end: '17:00' },
      },
    },
  });

  const channel = await prisma.channel.upsert({
    where: { id: 'default-channel' },
    update: {},
    create: {
      id: 'default-channel',
      name: 'Work',
      user_id: user.id,
      visibility: ChannelVisibility.private,
      color: '#4F46E5',
    },
  });

  const planningSession = await prisma.planningSession.create({
    data: {
      user_id: user.id,
      type: PlanningSessionType.morning,
      started_at: new Date(),
      completed_at: new Date(),
      context: PlanningContext.work,
      source: PlanningSource.manual,
      notes: 'Kick off the day with priority planning.',
    },
  });

  const task = await prisma.task.create({
    data: {
      user_id: user.id,
      title: 'Plan sprint backlog',
      status: TaskStatus.in_progress,
      priority_score: 4.5,
      priority_level: 4,
      due_at: new Date(Date.now() + 72 * 60 * 60 * 1000),
      planned_minutes: 90,
      estimated_minutes: 120,
      channel_id: channel.id,
      planned_sessions: [planningSession.id],
      labels: ['planning', 'sprint'],
      rollover_state: { carried_from_date: null, rolled_minutes: 0 },
      rich_notes: 'Align with the team on priorities and dependencies.',
      time_blocks: {
        create: [
          {
            user_id: user.id,
            start_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
            end_at: new Date(Date.now() + 3 * 60 * 60 * 1000),
            status: TimeBlockStatus.confirmed,
            provider: Provider.local,
            notes: 'Deep work block to organize backlog items.',
          },
        ],
      },
      subtasks: {
        create: [
          {
            title: 'Review carryover tasks',
            status: TaskStatus.todo,
            order: 1,
          },
          {
            title: 'Prioritize new requests',
            status: TaskStatus.todo,
            order: 2,
          },
        ],
      },
    },
  });

  await prisma.focusSession.create({
    data: {
      user_id: user.id,
      task_id: task.id,
      start_at: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
      end_at: new Date(Date.now() + 3.5 * 60 * 60 * 1000),
      planned_minutes: 60,
      actual_minutes: 55,
      status: FocusSessionStatus.completed,
      interruptions: { pings: 2 },
    },
  });

  await prisma.objective.create({
    data: {
      user_id: user.id,
      type: 'weekly',
      title: 'Ship next sprint plan',
      description: 'Finalize the plan and share with stakeholders.',
      target_week: new Date(),
      status: 'in-progress',
    },
  });

  await prisma.calendarIntegration.upsert({
    where: { id: 'dev-google-calendar' },
    update: {},
    create: {
      id: 'dev-google-calendar',
      user_id: user.id,
      provider: Provider.google,
      access_token: 'dummy-access-token',
      refresh_token: 'dummy-refresh-token',
      sync_state: { last_sync_at: new Date().toISOString(), cursor: 'initial' },
      sync_mode: SyncMode.polling,
      calendar_id: 'primary',
    },
  });

  await prisma.auditLog.create({
    data: {
      user_id: user.id,
      action: 'seed',
      entity_type: 'User',
      entity_id: user.id,
      metadata: { reason: 'Initial development data' },
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
