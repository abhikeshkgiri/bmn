import { Types } from 'mongoose';
import AuditLog from '@/models/AuditLog';
import { connectDB } from '@/lib/db';
import type { AuthUser } from '@/types';

interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
}

export async function recordAuditEvent(input: {
  actor?: AuthUser;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  context?: AuditContext;
}): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      actorId: input.actor?._id ? new Types.ObjectId(input.actor._id) : undefined,
      actorRole: input.actor?.role,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId && Types.ObjectId.isValid(input.entityId) ? new Types.ObjectId(input.entityId) : undefined,
      metadata: input.metadata || {},
      ipAddress: input.context?.ipAddress,
      userAgent: input.context?.userAgent,
    });
  } catch {
    console.error('Audit event could not be persisted');
  }
}
