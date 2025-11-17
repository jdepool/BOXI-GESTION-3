import { Request } from "express";
import { db } from "./db";
import { auditLogs } from "@shared/schema";

interface AuditLogParams {
  req: Request;
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete";
  fieldChanges?: Record<string, { before: any; after: any }>;
}

/**
 * Create an audit log entry for guest or user actions
 */
export const logAction = async (params: AuditLogParams) => {
  const { req, entityType, entityId, action, fieldChanges } = params;

  // Determine actor type and ID
  let actorType: "user" | "guest";
  let actorId: string;

  if (req.guestUser) {
    actorType = "guest";
    actorId = req.guestUser.tokenId;
  } else if (req.user) {
    actorType = "user";
    actorId = (req.user as any).id;
  } else {
    // No actor identified - skip logging
    console.warn("Audit log skipped: No actor identified");
    return;
  }

  // Get IP address
  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown";

  try {
    await db.insert(auditLogs).values({
      actorType,
      actorId,
      entityType,
      entityId,
      action,
      fieldChanges: fieldChanges || null,
      ipAddress,
    });

    console.log(
      `📋 Audit log: ${actorType} ${actorId} ${action}d ${entityType} ${entityId}`
    );
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - logging failure shouldn't block the main operation
  }
};

/**
 * Helper to calculate field changes between old and new objects
 */
export const calculateFieldChanges = (
  oldData: Record<string, any>,
  newData: Record<string, any>,
  fieldsToTrack?: string[]
): Record<string, { before: any; after: any }> => {
  const changes: Record<string, { before: any; after: any }> = {};

  const keysToCheck = fieldsToTrack || Object.keys(newData);

  for (const key of keysToCheck) {
    if (oldData[key] !== newData[key]) {
      changes[key] = {
        before: oldData[key],
        after: newData[key],
      };
    }
  }

  return changes;
};
