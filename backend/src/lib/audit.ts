import { prisma } from './prisma';
import { log } from './logger';

export interface AuditEntry {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export const recordAuditLog = async ({
  userId,
  action,
  entityType,
  entityId,
  metadata,
}: AuditEntry) => {
  const entry = await prisma.auditLog.create({
    data: {
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? {},
    },
  });

  log({
    level: 'info',
    message: 'audit_log_recorded',
    userId,
    action,
    entityType,
    entityId,
  });

  return entry;
};
