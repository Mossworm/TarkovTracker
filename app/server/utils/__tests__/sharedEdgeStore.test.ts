import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const createCacheMock = (): Cache => {
  const entries = new Map<string, Response>();
  const toKey = (request: RequestInfo | URL) => {
    return request instanceof Request ? request.url : String(request);
  };
  return {
    match: vi.fn(async (request: RequestInfo | URL) => {
      const response = entries.get(toKey(request));
      return response ? response.clone() : undefined;
    }),
    put: vi.fn(async (request: RequestInfo | URL, response: Response) => {
      entries.set(toKey(request), response.clone());
    }),
  } as unknown as Cache;
};
const createHandle = () => ({
  cache: createCacheMock(),
  origin: {
    host: 'example.com',
    protocol: 'https:',
  },
});
describe('consumeSharedRateLimit', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it('keeps enforcing the active shared window', async () => {
    const { consumeSharedRateLimit, writeSharedCache } =
      await import('@/server/utils/sharedEdgeStore');
    const handle = createHandle();
    await writeSharedCache(
      handle,
      'rate-limit',
      'user-1',
      {
        count: 4,
        resetAt: Date.now() + 1000,
      },
      1000
    );
    await expect(consumeSharedRateLimit(handle, 'rate-limit', 'user-1', 5, 60_000)).resolves.toBe(
      true
    );
    await expect(consumeSharedRateLimit(handle, 'rate-limit', 'user-1', 5, 60_000)).resolves.toBe(
      false
    );
  });
  it('opens a new local window once the shared window has rolled over', async () => {
    const { consumeSharedRateLimit, writeSharedCache } =
      await import('@/server/utils/sharedEdgeStore');
    const handle = createHandle();
    await writeSharedCache(
      handle,
      'rate-limit',
      'user-1',
      {
        count: 4,
        resetAt: Date.now() + 1000,
      },
      1000
    );
    await expect(consumeSharedRateLimit(handle, 'rate-limit', 'user-1', 5, 60_000)).resolves.toBe(
      true
    );
    vi.setSystemTime(new Date('2026-03-10T12:00:01.500Z'));
    await expect(consumeSharedRateLimit(handle, 'rate-limit', 'user-1', 5, 60_000)).resolves.toBe(
      true
    );
  });
  it('keeps the newer local window count when the shared window is older', async () => {
    const { consumeSharedRateLimit, readSharedCache, writeSharedCache } =
      await import('@/server/utils/sharedEdgeStore');
    const handle = createHandle();
    const localResetAt = new Date('2026-03-10T12:01:00.000Z').getTime();
    const sharedResetAt = new Date('2026-03-10T12:00:30.000Z').getTime();
    await expect(consumeSharedRateLimit(handle, 'rate-limit', 'user-1', 5, 60_000)).resolves.toBe(
      true
    );
    vi.setSystemTime(new Date('2026-03-10T12:00:05.000Z'));
    await writeSharedCache(
      handle,
      'rate-limit',
      'user-1',
      {
        count: 4,
        resetAt: sharedResetAt,
      },
      sharedResetAt - Date.now()
    );
    await expect(consumeSharedRateLimit(handle, 'rate-limit', 'user-1', 5, 60_000)).resolves.toBe(
      true
    );
    await expect(readSharedCache(handle, 'rate-limit', 'user-1')).resolves.toEqual({
      count: 2,
      resetAt: localResetAt,
    });
  });
  it('keeps the newer shared window count when the local window is older', async () => {
    const { consumeSharedRateLimit, readSharedCache, writeSharedCache } =
      await import('@/server/utils/sharedEdgeStore');
    const handle = createHandle();
    const sharedResetAt = new Date('2026-03-10T12:01:30.000Z').getTime();
    await expect(consumeSharedRateLimit(handle, 'rate-limit', 'user-1', 5, 60_000)).resolves.toBe(
      true
    );
    await expect(consumeSharedRateLimit(handle, 'rate-limit', 'user-1', 5, 60_000)).resolves.toBe(
      true
    );
    await expect(consumeSharedRateLimit(handle, 'rate-limit', 'user-1', 5, 60_000)).resolves.toBe(
      true
    );
    await expect(consumeSharedRateLimit(handle, 'rate-limit', 'user-1', 5, 60_000)).resolves.toBe(
      true
    );
    vi.setSystemTime(new Date('2026-03-10T12:00:05.000Z'));
    await writeSharedCache(
      handle,
      'rate-limit',
      'user-1',
      {
        count: 1,
        resetAt: sharedResetAt,
      },
      sharedResetAt - Date.now()
    );
    await expect(consumeSharedRateLimit(handle, 'rate-limit', 'user-1', 5, 60_000)).resolves.toBe(
      true
    );
    await expect(readSharedCache(handle, 'rate-limit', 'user-1')).resolves.toEqual({
      count: 2,
      resetAt: sharedResetAt,
    });
  });
  it('preserves the local fallback counter when shared cache writes fail', async () => {
    const { consumeSharedRateLimit } = await import('@/server/utils/sharedEdgeStore');
    const handle = {
      cache: {
        match: vi.fn(async () => undefined),
        put: vi.fn(async () => {
          throw new Error('cache unavailable');
        }),
      } as unknown as Cache,
      origin: {
        host: 'example.com',
        protocol: 'https:',
      },
    };
    await expect(consumeSharedRateLimit(handle, 'rate-limit', 'user-1', 2, 60_000)).resolves.toBe(
      true
    );
    await expect(consumeSharedRateLimit(handle, 'rate-limit', 'user-1', 2, 60_000)).resolves.toBe(
      true
    );
    await expect(consumeSharedRateLimit(handle, 'rate-limit', 'user-1', 2, 60_000)).resolves.toBe(
      false
    );
  });
});
