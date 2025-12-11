export type TelemetryEventName =
  | 'task.created'
  | 'task.priority_updated'
  | 'timeblock.scheduled'
  | 'focus_session.completed'
  | 'planning_session.completed'
  | 'highlight.created'
  | 'objective.created'
  | 'break.scheduled'
  | 'calendar.connected'
  | 'calendar.disconnected'
  | 'calendar.synced'
  | 'calendar.auto_schedule';

export function trackEvent(
  name: TelemetryEventName,
  properties?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.info(`[telemetry] ${name}`, properties ?? {});
  }
}
