-- Add unique constraint for synced calendar events per user
CREATE UNIQUE INDEX "TimeBlock_user_id_calendar_event_id_key" ON "TimeBlock"("user_id","calendar_event_id");
