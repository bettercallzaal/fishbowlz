import { NextRequest } from 'next/server';

/** Minimal audit log stub for standalone FISHBOWLZ */
export function logAuditEvent(event: {
  actorFid: number;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  ipAddress: string | null;
}) {
  console.log('[AUDIT]', event.action, event.targetId);
}

export function getClientIp(req: NextRequest): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
}
