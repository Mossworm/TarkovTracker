// @vitest-environment happy-dom
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '@/utils/storageKeys';
const runtimeConfig = {
  public: {
    supabaseAnonKey: 'test-anon-key',
    supabaseUrl: 'https://test.supabase.co',
  },
};
const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));
mockNuxtImport('useRuntimeConfig', () => () => runtimeConfig);
vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));
type MockAuthStateChangeCallback = (
  event: string,
  session: { user?: { id?: string } } | null
) => void;
type SupabasePluginProvide = {
  provide: {
    supabase: {
      signInWithOAuth: (
        provider: 'github',
        options?: { redirectTo?: string; skipBrowserRedirect?: boolean }
      ) => Promise<unknown>;
      signOut: () => Promise<void>;
    };
  };
};
// flushPlugin calls flushPromises twice to drain nested microtasks/promises from plugin lifecycle work.
const flushPlugin = async () => {
  await flushPromises();
  await flushPromises();
};
const createSession = (userId: string | null) => {
  if (!userId) {
    return null;
  }
  return {
    user: {
      app_metadata: {},
      id: userId,
      user_metadata: {},
    },
  };
};
const createClientMock = (initialUserId: string) => {
  let authStateChangeCallback: MockAuthStateChangeCallback | null = null;
  const signInWithOAuth = vi.fn().mockResolvedValue({
    data: {
      provider: 'github',
      url: null,
    },
    error: null,
  });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  mockCreateClient.mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: createSession(initialUserId),
        },
      }),
      onAuthStateChange: vi.fn((callback: MockAuthStateChangeCallback) => {
        authStateChangeCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }),
      signInWithOAuth,
      signOut,
    },
  });
  return {
    getAuthStateChangeCallback: () => authStateChangeCallback,
    signInWithOAuth,
    signOut,
  };
};
describe('supabase plugin', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    runtimeConfig.public.supabaseAnonKey = 'test-anon-key';
    runtimeConfig.public.supabaseUrl = 'https://test.supabase.co';
    localStorage.setItem('sb-test-auth-token', 'token');
    localStorage.setItem(STORAGE_KEYS.progress, 'progress-state');
    localStorage.setItem(STORAGE_KEYS.preferences, 'preferences-state');
  });
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  it('preserves scoped local state during auth user switches', async () => {
    const { getAuthStateChangeCallback, signInWithOAuth } = createClientMock('user-1');
    const plugin = (await import('@/plugins/supabase.client')).default;
    const result = plugin({} as Parameters<typeof plugin>[0]) as SupabasePluginProvide;
    await flushPlugin();
    await result.provide.supabase.signInWithOAuth('github', {
      skipBrowserRedirect: true,
    });
    const authStateChangeCallback = getAuthStateChangeCallback();
    expect(authStateChangeCallback).toBeTypeOf('function');
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    authStateChangeCallback?.('SIGNED_IN', createSession('user-2'));
    await flushPlugin();
    expect(localStorage.getItem(STORAGE_KEYS.progress)).toBe('progress-state');
    expect(localStorage.getItem(STORAGE_KEYS.preferences)).toBe('preferences-state');
  });
  it('preserves scoped local state after signOut', async () => {
    const { signOut } = createClientMock('user-1');
    const plugin = (await import('@/plugins/supabase.client')).default;
    const result = plugin({} as Parameters<typeof plugin>[0]) as SupabasePluginProvide;
    await flushPlugin();
    await result.provide.supabase.signOut();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_KEYS.progress)).toBe('progress-state');
    expect(localStorage.getItem(STORAGE_KEYS.preferences)).toBe('preferences-state');
  });
});
