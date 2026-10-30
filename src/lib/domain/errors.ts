export type ServiceErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_TRANSITION'
  | 'PLAN_STALE'
  | 'PLAN_EXPIRED'
  | 'PLAN_NOT_PROPOSED'
  | 'SOD_SELF_APPROVAL'
  | 'INSUFFICIENT_STOCK'
  | 'EVIDENCE_MISSING'
  | 'INTERNAL';

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ServiceErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  toJSON() {
    return { code: this.code, message: this.message, details: this.details };
  }
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ServiceErrorCode; message: string; details?: unknown } };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function err(error: unknown): ActionResult<never> {
  if (error instanceof ServiceError) {
    return { ok: false, error: { code: error.code, message: error.message, details: error.details } };
  }
  const message = error instanceof Error ? error.message : 'Unexpected error';
  return { ok: false, error: { code: 'INTERNAL', message } };
}
