export type CalendarProvider = 'google' | 'ical';

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface CalendarSyncState {
  lastSyncAt?: Date;
  cursor?: string;
  syncMode: 'polling' | 'webhook';
}

export interface CalendarIntegrationRecord {
  id: string;
  userId: string;
  provider: CalendarProvider;
  calendarId?: string;
  tokens: TokenSet;
  syncState: CalendarSyncState;
}
