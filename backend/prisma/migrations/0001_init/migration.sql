-- Create required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum definitions
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE "TaskImportState" AS ENUM ('proposed', 'accepted', 'ignored');
CREATE TYPE "TimeBlockStatus" AS ENUM ('tentative', 'confirmed', 'completed', 'cancelled');
CREATE TYPE "ChannelVisibility" AS ENUM ('private', 'shared');
CREATE TYPE "PlanningSessionType" AS ENUM ('morning', 'evening', 'weekly', 'custom');
CREATE TYPE "PlanningContext" AS ENUM ('work', 'personal');
CREATE TYPE "PlanningSource" AS ENUM ('auto', 'manual');
CREATE TYPE "FocusSessionStatus" AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE "SyncMode" AS ENUM ('polling', 'webhook');
CREATE TYPE "Provider" AS ENUM ('google', 'ical', 'local');

-- User table
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL UNIQUE,
    "display_name" TEXT NOT NULL,
    "settings" JSONB,
    "onboarding_state" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Channel table
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "visibility" "ChannelVisibility" NOT NULL DEFAULT 'private',
    "target_calendar_id" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Channel_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Task table
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rich_notes" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "priority_score" DOUBLE PRECISION,
    "priority_level" INTEGER NOT NULL DEFAULT 3,
    "due_at" TIMESTAMPTZ,
    "planned_minutes" INTEGER,
    "estimated_minutes" INTEGER,
    "actual_minutes" INTEGER,
    "channel_id" TEXT,
    "planned_sessions" TEXT[] NOT NULL DEFAULT '{}',
    "recurrence_rule" TEXT,
    "rollover_state" JSONB,
    "labels" TEXT[] NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Subtask table
CREATE TABLE "Subtask" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "task_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subtask_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Task import table
CREATE TABLE "TaskImport" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_ref" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "task_id" TEXT,
    "state" "TaskImportState" NOT NULL DEFAULT 'proposed',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskImport_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskImport_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Time block table
CREATE TABLE "TimeBlock" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "task_id" TEXT,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "status" "TimeBlockStatus" NOT NULL DEFAULT 'tentative',
    "location" TEXT,
    "notes" TEXT,
    "calendar_event_id" TEXT,
    "provider" "Provider" NOT NULL,
    "recurrence_rule" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeBlock_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeBlock_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Planning session table
CREATE TABLE "PlanningSession" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "type" "PlanningSessionType" NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "context" "PlanningContext" NOT NULL,
    "source" "PlanningSource" NOT NULL,
    "notes" TEXT,
    CONSTRAINT "PlanningSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Objective table
CREATE TABLE "Objective" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_week" TIMESTAMPTZ,
    "status" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Objective_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Focus session table
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "planned_minutes" INTEGER NOT NULL,
    "actual_minutes" INTEGER,
    "status" "FocusSessionStatus" NOT NULL DEFAULT 'active',
    "interruptions" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FocusSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FocusSession_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Calendar integration table
CREATE TABLE "CalendarIntegration" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMPTZ,
    "sync_state" JSONB,
    "sync_mode" "SyncMode" NOT NULL DEFAULT 'polling',
    "calendar_id" TEXT,
    CONSTRAINT "CalendarIntegration_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Audit log table
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX "Task_user_status_idx" ON "Task"("user_id", "status");
CREATE INDEX "Task_user_priority_score_idx" ON "Task"("user_id", "priority_score" DESC);
CREATE INDEX "Task_user_due_idx" ON "Task"("user_id", "due_at");
CREATE INDEX "Task_user_channel_idx" ON "Task"("user_id", "channel_id");
CREATE INDEX "Task_labels_gin" ON "Task" USING GIN ("labels");
CREATE INDEX "Subtask_task_order_idx" ON "Subtask"("task_id", "order");
CREATE INDEX "TimeBlock_user_time_idx" ON "TimeBlock"("user_id", "start_at", "end_at");
CREATE INDEX "PlanningSession_user_started_idx" ON "PlanningSession"("user_id", "started_at" DESC);
CREATE INDEX "FocusSession_user_started_idx" ON "FocusSession"("user_id", "start_at" DESC);
CREATE INDEX "CalendarIntegration_user_provider_idx" ON "CalendarIntegration"("user_id", "provider");
