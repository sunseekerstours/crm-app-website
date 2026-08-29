import { Request } from 'express';

export interface RequestContext {
  userId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/** Builds a RequestContext from an express request and acting user id. */
export function toRequestContext(req: Request, userId?: string | null): RequestContext {
  return {
    userId: userId ?? (req as any).user?.id ?? null,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: (req as any).requestId,
  };
}
