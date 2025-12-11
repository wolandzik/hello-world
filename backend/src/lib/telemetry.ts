import { log } from './logger';

export type TelemetryEvent =
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'task.priority'
  | 'timeblock.created'
  | 'calendar.sync'
  | 'digest.generated';

export const trackTelemetry = (
  event: TelemetryEvent,
  properties?: Record<string, unknown>
) => {
  log({ level: 'info', message: 'telemetry_event', event, ...properties });
};
