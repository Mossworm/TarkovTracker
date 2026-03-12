export type UserScopedStorageEnvelope<T> = {
  _timestamp?: number;
  _userId: string | null;
  data: T;
};
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};
export const getCurrentSupabaseUserId = (): string | null => {
  try {
    const nuxtApp = useNuxtApp();
    return nuxtApp.$supabase?.user?.id || null;
  } catch {
    return null;
  }
};
export const serializeUserScopedStorage = <T>(
  data: T,
  userId: string | null = getCurrentSupabaseUserId(),
  timestamp: number = Date.now()
): string => {
  return JSON.stringify({
    _timestamp: timestamp,
    _userId: userId,
    data,
  } satisfies UserScopedStorageEnvelope<T>);
};
export const parseUserScopedStorage = <T>(raw: string): UserScopedStorageEnvelope<T> | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !('data' in parsed)) {
      return null;
    }
    const userId = typeof parsed._userId === 'string' ? parsed._userId : null;
    const timestamp = typeof parsed._timestamp === 'number' ? parsed._timestamp : undefined;
    return {
      _timestamp: timestamp,
      _userId: userId,
      data: parsed.data as T,
    };
  } catch {
    return null;
  }
};
