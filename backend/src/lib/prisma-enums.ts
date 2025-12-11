export const TaskStatusEnum = {
  todo: 'todo',
  in_progress: 'in_progress',
  done: 'done',
} as const;

export const TimeBlockStatusEnum = {
  tentative: 'tentative',
  confirmed: 'confirmed',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;

export const ProviderEnum = {
  google: 'google',
  ical: 'ical',
  local: 'local',
} as const;

export const ChannelVisibilityEnum = {
  private: 'private',
  shared: 'shared',
} as const;

