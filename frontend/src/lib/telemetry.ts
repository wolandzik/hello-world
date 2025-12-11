export type TelemetryEventName =
  | 'task.created'
  | 'task.priority_updated'
  | 'timeblock.scheduled'
  | 'focus_session.completed'
  | 'planning_session.completed'
  | 'highlight.created'
  | 'objective.created'
  | 'break.scheduled';

export function trackEvent(
  name: TelemetryEventName,
  properties?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.info(`[telemetry] ${name}`, properties ?? {});
  }
}
