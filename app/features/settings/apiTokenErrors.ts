import { getErrorStatus, isTransientNetworkError } from '@/utils/errors';
const DIRECT_INSERT_ALLOWED_STATUSES = new Set([404, 405]);
const DIRECT_INSERT_BLOCKED_STATUSES = new Set([401, 403, 429]);
export const shouldFallbackToDirectTokenInsert = (error: unknown): boolean => {
  if (isTransientNetworkError(error)) {
    return true;
  }
  const status = getErrorStatus(error);
  if (status === null) {
    return true;
  }
  if (DIRECT_INSERT_BLOCKED_STATUSES.has(status)) {
    return false;
  }
  return DIRECT_INSERT_ALLOWED_STATUSES.has(status) || status >= 500;
};
